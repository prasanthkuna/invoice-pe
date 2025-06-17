import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '../lib/supabase';
import { debugContext } from '../utils/logger';
import type { SavedCard, SaveCardRequest, SavedCardsResponse, SaveCardResponse } from '@invoicepe/types';

interface SavedCardsState {
  cards: SavedCard[];
  loading: boolean;
  error: string | null;
}

export const useSavedCards = () => {
  const [state, setState] = useState<SavedCardsState>({
    cards: [],
    loading: false,
    error: null,
  });

  const fetchSavedCards = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    debugContext.cardManagement({ action: 'fetch_cards', step: 'start' });

    try {
      const response = await apiClient.get('/saved-cards') as SavedCardsResponse;

      if (response.success) {
        debugContext.cardManagement({
          action: 'fetch_cards',
          step: 'success',
          count: response.cards.length
        });
        setState(prev => ({
          ...prev,
          cards: response.cards,
          loading: false,
        }));
      } else {
        debugContext.cardManagement({
          action: 'fetch_cards',
          step: 'api_error',
          message: response.message
        });
        setState(prev => ({
          ...prev,
          error: response.message,
          loading: false,
        }));
      }
    } catch (error) {
      debugContext.error('card-management', error as Error, {
        action: 'fetch_cards',
        step: 'network_error'
      });
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to fetch saved cards',
        loading: false,
      }));
    }
  }, []);

  const saveCard = useCallback(async (cardData: SaveCardRequest): Promise<SavedCard | null> => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    debugContext.cardManagement({ action: 'save_card', step: 'start', cardType: cardData.card_type });

    try {
      const response = await apiClient.post('/saved-cards', cardData) as SaveCardResponse;

      if (response.success && response.card) {
        debugContext.cardManagement({
          action: 'save_card',
          step: 'success',
          cardId: response.card.id,
          isDefault: response.card.is_default
        });
        setState(prev => ({
          ...prev,
          cards: [response.card!, ...prev.cards],
          loading: false,
        }));
        return response.card;
      } else {
        debugContext.cardManagement({
          action: 'save_card',
          step: 'api_error',
          message: response.message
        });
        setState(prev => ({
          ...prev,
          error: response.message,
          loading: false,
        }));
        return null;
      }
    } catch (error) {
      debugContext.error('card-management', error as Error, {
        action: 'save_card',
        step: 'network_error',
        cardType: cardData.card_type
      });
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to save card',
        loading: false,
      }));
      return null;
    }
  }, []);

  const updateCard = useCallback(async (cardId: string, updateData: Partial<SavedCard>): Promise<boolean> => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const response = await apiClient.put(`/saved-cards?id=${cardId}`, updateData) as SaveCardResponse;
      
      if (response.success && response.card) {
        setState(prev => ({
          ...prev,
          cards: prev.cards.map(card => 
            card.id === cardId ? response.card! : card
          ),
          loading: false,
        }));
        return true;
      } else {
        setState(prev => ({
          ...prev,
          error: response.message,
          loading: false,
        }));
        return false;
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to update card',
        loading: false,
      }));
      return false;
    }
  }, []);

  const deleteCard = useCallback(async (cardId: string): Promise<boolean> => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const response = await apiClient.delete(`/saved-cards?id=${cardId}`) as { success: boolean; message: string };
      
      if (response.success) {
        setState(prev => ({
          ...prev,
          cards: prev.cards.filter(card => card.id !== cardId),
          loading: false,
        }));
        return true;
      } else {
        setState(prev => ({
          ...prev,
          error: response.message,
          loading: false,
        }));
        return false;
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to delete card',
        loading: false,
      }));
      return false;
    }
  }, []);

  const setDefaultCard = useCallback(async (cardId: string): Promise<boolean> => {
    return await updateCard(cardId, { is_default: true });
  }, [updateCard]);

  const getDefaultCard = useCallback((): SavedCard | null => {
    return state.cards.find(card => card.is_default) || null;
  }, [state.cards]);

  const getCardById = useCallback((cardId: string): SavedCard | null => {
    return state.cards.find(card => card.id === cardId) || null;
  }, [state.cards]);

  // Load saved cards on mount
  useEffect(() => {
    fetchSavedCards();
  }, [fetchSavedCards]);

  return {
    ...state,
    fetchSavedCards,
    saveCard,
    updateCard,
    deleteCard,
    setDefaultCard,
    getDefaultCard,
    getCardById,
    hasCards: state.cards.length > 0,
  };
};

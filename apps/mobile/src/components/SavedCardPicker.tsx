import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { Card, Button, colors, spacing, typography } from '@invoicepe/ui-kit';
import { useSavedCards } from '../hooks/useSavedCards';
import { AnimatedButton } from './animations/AnimatedButton';
import { FadeInView } from './animations/FadeInView';
import { SlideInView } from './animations/SlideInView';
import { SkeletonLoader } from './animations/SkeletonLoader';
import type { SavedCard } from '@invoicepe/types';

interface SavedCardPickerProps {
  selectedCardId?: string;
  onSelect: (card: SavedCard | null) => void;
  onAddNewCard: () => void;
  error?: string;
}

export const SavedCardPicker: React.FC<SavedCardPickerProps> = ({
  selectedCardId,
  onSelect,
  onAddNewCard,
  error,
}) => {
  const { cards, loading, deleteCard, setDefaultCard } = useSavedCards();
  const [deletingCardId, setDeletingCardId] = useState<string | null>(null);

  const handleCardSelect = (card: SavedCard) => {
    onSelect(card);
  };

  const handleDeleteCard = async (card: SavedCard) => {
    Alert.alert(
      'Delete Card',
      `Are you sure you want to delete ${card.masked_card}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeletingCardId(card.id);
            const success = await deleteCard(card.id);
            setDeletingCardId(null);
            
            if (success && selectedCardId === card.id) {
              onSelect(null);
            }
          },
        },
      ]
    );
  };

  const handleSetDefault = async (card: SavedCard) => {
    await setDefaultCard(card.id);
  };

  const getCardIcon = (cardType: string) => {
    switch (cardType) {
      case 'VISA':
        return '💳';
      case 'MASTERCARD':
        return '💳';
      case 'RUPAY':
        return '💳';
      case 'AMEX':
        return '💳';
      default:
        return '💳';
    }
  };

  const formatExpiryDate = (month: string, year: string) => {
    return `${month.padStart(2, '0')}/${year.slice(-2)}`;
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Saved Cards</Text>
        <View style={styles.loadingContainer}>
          {[1, 2, 3].map((index) => (
            <SkeletonLoader
              key={index}
              width="100%"
              height={80}
              borderRadius={12}
              style={{ marginBottom: spacing.sm }}
            />
          ))}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FadeInView>
        <Text style={styles.title}>💳 Saved Cards</Text>
      </FadeInView>

      {cards.length === 0 ? (
        <SlideInView delay={100} direction="up">
          <Card padding="lg" variant="outlined" style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No Saved Cards</Text>
            <Text style={styles.emptyText}>
              Add a card to make faster payments in the future
            </Text>
            <Button
              title="Add First Card"
              onPress={onAddNewCard}
              size="sm"
              style={styles.addButton}
            />
          </Card>
        </SlideInView>
      ) : (
        <>
          {cards.map((card, index) => (
            <SlideInView key={card.id} delay={100 + index * 50} direction="up">
              <AnimatedButton
                onPress={() => handleCardSelect(card)}
                style={[
                  styles.cardItem,
                  selectedCardId === card.id && styles.selectedCard,
                ]}
                disabled={deletingCardId === card.id}
              >
                <View style={styles.cardContent}>
                  <View style={styles.cardHeader}>
                    <View style={styles.cardInfo}>
                      <Text style={styles.cardIcon}>
                        {getCardIcon(card.card_type)}
                      </Text>
                      <View style={styles.cardDetails}>
                        <Text style={styles.cardNumber}>{card.masked_card}</Text>
                        <Text style={styles.cardExpiry}>
                          Expires {formatExpiryDate(card.expiry_month, card.expiry_year)}
                        </Text>
                      </View>
                    </View>
                    
                    {card.is_default && (
                      <View style={styles.defaultBadge}>
                        <Text style={styles.defaultText}>DEFAULT</Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.cardActions}>
                    {!card.is_default && (
                      <AnimatedButton
                        onPress={() => handleSetDefault(card)}
                        style={styles.actionButton}
                      >
                        <Text style={styles.actionButtonText}>Set Default</Text>
                      </AnimatedButton>
                    )}
                    
                    <AnimatedButton
                      onPress={() => handleDeleteCard(card)}
                      style={[styles.actionButton, styles.deleteButton]}
                      disabled={deletingCardId === card.id}
                    >
                      <Text style={[styles.actionButtonText, styles.deleteButtonText]}>
                        {deletingCardId === card.id ? 'Deleting...' : 'Delete'}
                      </Text>
                    </AnimatedButton>
                  </View>
                </View>
              </AnimatedButton>
            </SlideInView>
          ))}

          <SlideInView delay={100 + cards.length * 50} direction="up">
            <AnimatedButton
              onPress={onAddNewCard}
              style={styles.addNewCard}
            >
              <Text style={styles.addNewCardText}>+ Add New Card</Text>
            </AnimatedButton>
          </SlideInView>
        </>
      )}

      {error && (
        <FadeInView delay={200}>
          <Text style={styles.errorText}>{error}</Text>
        </FadeInView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.lg,
  },
  title: {
    ...typography.h3,
    color: colors.text,
    marginBottom: spacing.md,
  },
  loadingContainer: {
    gap: spacing.sm,
  },
  emptyCard: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  emptyTitle: {
    ...typography.h3,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  emptyText: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  addButton: {
    minWidth: 150,
  },
  cardItem: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedCard: {
    borderColor: colors.primary[500],
    backgroundColor: colors.surface,
  },
  cardContent: {
    gap: spacing.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  cardIcon: {
    fontSize: 24,
    marginRight: spacing.md,
  },
  cardDetails: {
    flex: 1,
  },
  cardNumber: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  cardExpiry: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  defaultBadge: {
    backgroundColor: colors.primary[500],
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 4,
  },
  defaultText: {
    ...typography.caption,
    color: colors.white,
    fontWeight: '600',
    fontSize: 10,
  },
  cardActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionButton: {
    backgroundColor: colors.grey[700],
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 6,
  },
  actionButtonText: {
    ...typography.caption,
    color: colors.text,
    fontSize: 12,
  },
  deleteButton: {
    backgroundColor: colors.error[500],
  },
  deleteButtonText: {
    color: colors.white,
  },
  addNewCard: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: colors.primary[500],
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: spacing.lg,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  addNewCardText: {
    ...typography.body,
    color: colors.primary[500],
    fontWeight: '600',
  },
  errorText: {
    ...typography.caption,
    color: colors.error[500],
    marginTop: spacing.sm,
    textAlign: 'center',
  },
});

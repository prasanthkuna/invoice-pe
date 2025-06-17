import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  TextInput,
  Alert,
  Share,
} from 'react-native';
import { colors } from '@invoicepe/ui-kit';
import { logger, LogLevel } from '../utils/logger';

interface LogEntry {
  id: string;
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: any;
  error?: Error;
  data?: any;
}

interface DebugPanelProps {
  visible: boolean;
  onClose: () => void;
}

export const DebugPanel: React.FC<DebugPanelProps> = ({ visible, onClose }) => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<LogEntry[]>([]);
  const [selectedLevel, setSelectedLevel] = useState<LogLevel | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    if (visible) {
      refreshLogs();
      
      if (autoRefresh) {
        const interval = setInterval(refreshLogs, 2000);
        return () => clearInterval(interval);
      }
    }
  }, [visible, autoRefresh]);

  useEffect(() => {
    filterLogs();
  }, [logs, selectedLevel, searchQuery]);

  const refreshLogs = () => {
    const allLogs = logger.getLogs();
    setLogs(allLogs);
  };

  const filterLogs = () => {
    let filtered = logs;

    // Filter by level
    if (selectedLevel !== 'ALL') {
      filtered = filtered.filter(log => log.level >= selectedLevel);
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(log =>
        log.message.toLowerCase().includes(query) ||
        JSON.stringify(log.context || {}).toLowerCase().includes(query) ||
        (log.error?.message || '').toLowerCase().includes(query)
      );
    }

    setFilteredLogs(filtered.slice(-100)); // Show last 100 logs
  };

  const clearLogs = () => {
    Alert.alert(
      'Clear Logs',
      'Are you sure you want to clear all logs?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () => {
            logger.clearLogs();
            setLogs([]);
            setFilteredLogs([]);
          },
        },
      ]
    );
  };

  const exportLogs = async () => {
    try {
      const logsData = await logger.exportLogs();
      await Share.share({
        message: logsData,
        title: 'InvoicePe Debug Logs',
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to export logs');
    }
  };

  const getLevelColor = (level: LogLevel): string => {
    switch (level) {
      case LogLevel.DEBUG: return colors.textSecondary;
      case LogLevel.INFO: return colors.primary[500];
      case LogLevel.WARN: return '#FFA500';
      case LogLevel.ERROR: return colors.error[500];
      case LogLevel.FATAL: return '#8B0000';
      default: return colors.text;
    }
  };

  const getLevelName = (level: LogLevel): string => {
    return LogLevel[level];
  };

  const formatTimestamp = (timestamp: string): string => {
    return new Date(timestamp).toLocaleTimeString();
  };

  const renderLogEntry = (log: LogEntry) => (
    <View key={log.id} style={styles.logEntry}>
      <View style={styles.logHeader}>
        <Text style={[styles.logLevel, { color: getLevelColor(log.level) }]}>
          {getLevelName(log.level)}
        </Text>
        <Text style={styles.logTimestamp}>
          {formatTimestamp(log.timestamp)}
        </Text>
      </View>
      
      <Text style={styles.logMessage}>{log.message}</Text>
      
      {log.context && Object.keys(log.context).length > 0 && (
        <Text style={styles.logContext}>
          Context: {JSON.stringify(log.context, null, 2)}
        </Text>
      )}
      
      {log.error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>
            {log.error.name}: {log.error.message}
          </Text>
          {log.error.stack && (
            <Text style={styles.stackTrace}>{log.error.stack}</Text>
          )}
        </View>
      )}
      
      {log.data && (
        <Text style={styles.logData}>
          Data: {JSON.stringify(log.data, null, 2)}
        </Text>
      )}
    </View>
  );

  if (!__DEV__) {
    return null; // Only show in development
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Debug Panel</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>Close</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.controls}>
          <View style={styles.filterRow}>
            <Text style={styles.filterLabel}>Level:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {['ALL', ...Object.keys(LogLevel).filter(key => isNaN(Number(key)))].map(level => (
                <TouchableOpacity
                  key={level}
                  style={[
                    styles.levelButton,
                    selectedLevel === level && styles.levelButtonActive,
                  ]}
                  onPress={() => setSelectedLevel(level as LogLevel | 'ALL')}
                >
                  <Text
                    style={[
                      styles.levelButtonText,
                      selectedLevel === level && styles.levelButtonTextActive,
                    ]}
                  >
                    {level}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <TextInput
            style={styles.searchInput}
            placeholder="Search logs..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor={colors.textSecondary}
          />

          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.actionButton, autoRefresh && styles.actionButtonActive]}
              onPress={() => setAutoRefresh(!autoRefresh)}
            >
              <Text style={styles.actionButtonText}>
                Auto Refresh: {autoRefresh ? 'ON' : 'OFF'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionButton} onPress={refreshLogs}>
              <Text style={styles.actionButtonText}>Refresh</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionButton} onPress={exportLogs}>
              <Text style={styles.actionButtonText}>Export</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionButton} onPress={clearLogs}>
              <Text style={styles.actionButtonText}>Clear</Text>
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView style={styles.logsContainer}>
          <Text style={styles.logsCount}>
            Showing {filteredLogs.length} of {logs.length} logs
          </Text>
          {filteredLogs.map(renderLogEntry)}
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
  },
  closeButton: {
    padding: 8,
  },
  closeButtonText: {
    color: colors.primary[500],
    fontSize: 16,
  },
  controls: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  filterLabel: {
    fontSize: 14,
    color: colors.text,
    marginRight: 12,
    minWidth: 50,
  },
  levelButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    borderRadius: 16,
    backgroundColor: colors.surface,
  },
  levelButtonActive: {
    backgroundColor: colors.primary[500],
  },
  levelButtonText: {
    fontSize: 12,
    color: colors.text,
  },
  levelButtonTextActive: {
    color: colors.background,
  },
  searchInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: colors.text,
    backgroundColor: colors.surface,
    marginBottom: 12,
  },
  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  actionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    marginBottom: 8,
    borderRadius: 6,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  actionButtonActive: {
    backgroundColor: colors.primary[500],
    borderColor: colors.primary[500],
  },
  actionButtonText: {
    fontSize: 12,
    color: colors.text,
  },
  logsContainer: {
    flex: 1,
    padding: 16,
  },
  logsCount: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 16,
  },
  logEntry: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: colors.border,
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  logLevel: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  logTimestamp: {
    fontSize: 10,
    color: colors.textSecondary,
  },
  logMessage: {
    fontSize: 14,
    color: colors.text,
    marginBottom: 4,
  },
  logContext: {
    fontSize: 10,
    color: colors.textSecondary,
    fontFamily: 'monospace',
    marginBottom: 4,
  },
  errorContainer: {
    backgroundColor: colors.error[500] + '20',
    borderRadius: 4,
    padding: 8,
    marginTop: 4,
  },
  errorText: {
    fontSize: 12,
    color: colors.error[500],
    fontWeight: 'bold',
    marginBottom: 4,
  },
  stackTrace: {
    fontSize: 10,
    color: colors.error[500],
    fontFamily: 'monospace',
  },
  logData: {
    fontSize: 10,
    color: colors.textSecondary,
    fontFamily: 'monospace',
    marginTop: 4,
  },
});

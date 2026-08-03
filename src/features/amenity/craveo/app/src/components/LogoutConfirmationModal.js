import React from 'react';
import { View, StyleSheet, Modal } from 'react-native';
import { Card, Title, Paragraph, Button } from 'react-native-paper';
import { colors, spacing, borderRadius } from '../constants/theme';

const LogoutConfirmationModal = ({ visible, onCancel, onConfirm }) => {
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={styles.overlay}>
        <Card style={styles.card}>
          <Card.Content>
            <Title style={styles.title}>Logout</Title>
            <Paragraph style={styles.message}>
              Are you sure you want to logout?
            </Paragraph>
          </Card.Content>
          <Card.Actions style={styles.actions}>
            <Button 
              mode="outlined" 
              onPress={onCancel}
              style={styles.cancelButton}
              textColor={colors.primary}
            >
              Cancel
            </Button>
            <Button 
              mode="contained" 
              onPress={onConfirm}
              style={styles.confirmButton}
              buttonColor={colors.error}
            >
              Logout
            </Button>
          </Card.Actions>
        </Card>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  card: {
    minWidth: 280,
    maxWidth: 400,
    borderRadius: borderRadius.lg,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  title: {
    textAlign: 'center',
    color: colors.error,
    fontWeight: 'bold',
  },
  message: {
    textAlign: 'center',
    marginTop: spacing.sm,
    color: colors.onSurface,
  },
  actions: {
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
  },
  cancelButton: {
    flex: 1,
    marginRight: spacing.sm,
  },
  confirmButton: {
    flex: 1,
    marginLeft: spacing.sm,
  },
});

export default LogoutConfirmationModal;
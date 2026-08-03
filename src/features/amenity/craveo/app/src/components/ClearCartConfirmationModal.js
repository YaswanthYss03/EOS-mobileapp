import React from 'react';
import { View, StyleSheet, Modal } from 'react-native';
import { Card, Title, Paragraph, Button } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, spacing, borderRadius } from '../constants/theme';

const ClearCartConfirmationModal = ({ visible, onCancel, onConfirm, itemCount }) => {
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
            <View style={styles.header}>
              <MaterialCommunityIcons 
                name="cart-remove" 
                size={32} 
                color={colors.error} 
              />
              <Title style={styles.title}>Clear Cart</Title>
            </View>
            <Paragraph style={styles.message}>
              Are you sure you want to remove all {itemCount} item{itemCount !== 1 ? 's' : ''} from your cart?
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
              Clear All
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
    minWidth: 300,
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
  header: {
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  title: {
    textAlign: 'center',
    color: colors.error,
    fontWeight: 'bold',
    marginTop: spacing.sm,
  },
  message: {
    textAlign: 'center',
    color: colors.onSurface,
    lineHeight: 22,
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

export default ClearCartConfirmationModal;
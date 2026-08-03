import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { Text, Card, Title, Paragraph, Button } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, spacing, fontSize } from '../constants/theme';
import { formatCurrency } from '../utils/helpers';

const { width, height } = Dimensions.get('window');

const CODSuccessModal = ({ 
  visible, 
  orderData, 
  onClose 
}) => {
  if (!visible) return null;

  const { orderId, totalAmount, estimatedTime, items } = orderData || {};

  return (
    <View style={styles.overlay}>
      <View style={styles.container}>
        <Card style={styles.card}>
          <Card.Content style={styles.content}>
            {/* Success Icon */}
            <View style={styles.iconContainer}>
              <MaterialCommunityIcons 
                name="check-circle" 
                size={80} 
                color={colors.success} 
              />
            </View>

            {/* Success Title */}
            <Title style={styles.title}>COD Order Confirmed!</Title>

            {/* Order Details */}
            <View style={styles.detailsContainer}>
              <View style={styles.detailRow}>
                <MaterialCommunityIcons name="receipt" size={20} color={colors.primary} />
                <Text style={styles.detailText}>Order #{orderId}</Text>
              </View>

              <View style={styles.detailRow}>
                <MaterialCommunityIcons name="cash" size={20} color={colors.primary} />
                <Text style={styles.detailText}>Total: {formatCurrency(totalAmount)}</Text>
              </View>

              <View style={styles.detailRow}>
                <MaterialCommunityIcons name="clock-outline" size={20} color={colors.primary} />
                <Text style={styles.detailText}>Ready in: {estimatedTime} minutes</Text>
              </View>

              <View style={styles.detailRow}>
                <MaterialCommunityIcons name="food" size={20} color={colors.primary} />
                <Text style={styles.detailText}>{items?.length || 0} items ordered</Text>
              </View>
            </View>

            {/* Payment Instructions */}
            <View style={styles.instructionsContainer}>
              <View style={styles.instructionRow}>
                <MaterialCommunityIcons name="information" size={16} color={colors.info} />
                <Text style={styles.instructionText}>Pay in cash when collecting your order</Text>
              </View>
              
              <View style={styles.instructionRow}>
                <MaterialCommunityIcons name="home-heart" size={16} color={colors.info} />
                <Text style={styles.instructionText}>Girls Hosteller COD - Available after 5:30 PM</Text>
              </View>
            </View>

            {/* Success Message */}
            <Paragraph style={styles.message}>
              Your order has been confirmed and the kitchen has been notified. 
              Quantities have been reserved for you.
            </Paragraph>

            {/* Close Button */}
            <Button 
              mode="contained" 
              onPress={onClose}
              style={styles.button}
              labelStyle={styles.buttonLabel}
            >
              View My Orders
            </Button>
          </Card.Content>
        </Card>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  container: {
    width: width * 0.9,
    maxWidth: 400,
  },
  card: {
    borderRadius: 16,
    elevation: 8,
  },
  content: {
    alignItems: 'center',
    padding: spacing.xl,
  },
  iconContainer: {
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: 'bold',
    color: colors.success,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  detailsContainer: {
    width: '100%',
    marginBottom: spacing.lg,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  detailText: {
    fontSize: fontSize.md,
    marginLeft: spacing.sm,
    fontWeight: '500',
    color: colors.text,
  },
  instructionsContainer: {
    width: '100%',
    backgroundColor: colors.surface,
    borderRadius: 8,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  instructionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  instructionText: {
    fontSize: fontSize.sm,
    marginLeft: spacing.sm,
    color: colors.textSecondary,
    flex: 1,
  },
  message: {
    textAlign: 'center',
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: spacing.lg,
  },
  button: {
    width: '100%',
    paddingVertical: spacing.sm,
  },
  buttonLabel: {
    fontSize: fontSize.md,
    fontWeight: 'bold',
  },
});

export default CODSuccessModal;

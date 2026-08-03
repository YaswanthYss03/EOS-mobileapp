import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import { CameraView, Camera } from 'expo-camera';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useDispatch, useSelector } from 'react-redux';
import { SafeAreaView } from 'react-native-safe-area-context';

import { qrAPI } from '../services';
import CraveoBottomNav from '../components/CraveoBottomNav';
import FoodActivityIndicator from '../components/FoodActivityIndicator';
import { EnhancedQRLoader } from '../components/EnhancedLoaders';
import { showToast } from '../utils/toastUtils';
import { colors, spacing, fontSize, borderRadius } from '../constants/theme';

const QRScannerScreen = ({ navigation }) => {
  const [hasPermission, setHasPermission] = useState(null);
  const [scanned, setScanned] = useState(false);
  const [loading, setLoading] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);

  const { token, user, isAuthenticated } = useSelector(state => state.auth);
  const { pendingOrders = [], completedOrders = [] } = useSelector(state => state.orders || {});

  // Helper function to check if order is from today
  const isOrderFromToday = (orderDate) => {
    const today = new Date();
    const orderDateObj = new Date(orderDate);
    
    return today.getFullYear() === orderDateObj.getFullYear() &&
           today.getMonth() === orderDateObj.getMonth() &&
           today.getDate() === orderDateObj.getDate();
  };

  // Filter orders for printing: only successful non-COD payments, CONFIRMED orders only, and from today
  const allOrders = [
    ...(pendingOrders || [])
    // Only include pendingOrders (which contains CONFIRMED orders), not completedOrders
  ].filter(order => {
    // Only include orders from today
    const isFromToday = isOrderFromToday(order.created_at);
    
    // Only include orders with successful payment (NOT COD)
    const hasSuccessfulPayment = order.payment_status === 'success' && order.COD !== true;
    
    // Only include CONFIRMED orders (ready for printing, not yet completed)
    const isConfirmed = order.order_status === 'CONFIRMED';
    
    // Exclude failed payments
    const notFailed = order.payment_status !== 'failed' && order.payment_status !== 'failed_stock_released';
    
    // Log filtering decisions for debugging
    if (!isFromToday) {
      console.log('🚫 Excluding order due to date:', {
        order_id: order.order_id,
        created_at: order.created_at,
        reason: 'Order not from today'
      });
    }
    
    if (!hasSuccessfulPayment) {
      console.log('🚫 Excluding order due to payment status:', {
        order_id: order.order_id,
        payment_status: order.payment_status,
        COD: order.COD,
        reason: order.COD === true ? 'COD orders not allowed' : 'Payment not successful'
      });
    }
    
    if (!isConfirmed) {
      console.log('🚫 Excluding order due to order status:', {
        order_id: order.order_id,
        order_status: order.order_status,
        reason: 'Only CONFIRMED orders can be printed (not PENDING or COMPLETED)'
      });
    }
    
    if (!notFailed) {
      console.log('🚫 Excluding order due to failed payment:', {
        order_id: order.order_id,
        payment_status: order.payment_status
      });
    }
    
    return isFromToday && hasSuccessfulPayment && isConfirmed && notFailed;
  });

  console.log('📄 Filtered orders for printing:', {
    totalPendingOrders: (pendingOrders || []).length,
    filteredOrders: allOrders.length,
    printableOrders: allOrders.map(o => ({
      id: o.order_id,
      status: o.order_status,
      payment: o.payment_status,
      COD: o.COD,
      created_at: o.created_at
    }))
  });

  useEffect(() => {
    getCameraPermissions();
  }, []);

  const getCameraPermissions = async () => {
    const { status } = await Camera.requestCameraPermissionsAsync();
    setHasPermission(status === 'granted');
  };

  const handleBarCodeScanned = async ({ type, data }) => {
    if (scanned) return;
    setScanned(true);

    console.log('📱 QR Code Scanned:', { type, data });

    try {
      // Parse QR code data
      const qrData = JSON.parse(data);
      console.log('🔍 Parsed QR Data:', qrData);

      // Validate QR code structure
      if (!qrData.kiosk_id || !qrData.type) {
        throw new Error('Invalid QR code: Missing required fields (kiosk_id, type)');
      }

      if (qrData.type !== 'bill_print') {
        throw new Error(`Invalid QR code type: Expected 'bill_print', got '${qrData.type}'`);
      }

      // Show loading feedback
      showToast.info('Sending your bill to the kiosk...');

      // Get user data from Redux
      const userOrders = allOrders || [];
      const currentUser = user;

      // Debug user data structure
      console.log('🔍 Debug user data:', {
        user: currentUser,
        userKeys: currentUser ? Object.keys(currentUser) : 'No user',
        isAuthenticated: isAuthenticated,
        token: !!token
      });

      if (!currentUser) {
        throw new Error('User not logged in - no user data in Redux state');
      }

      // Check for different possible user ID fields
      const userId = currentUser.id || currentUser.user_id || currentUser.userId || currentUser.ID;
      
      if (!userId) {
        throw new Error(`User data missing ID field. Available fields: ${Object.keys(currentUser).join(', ')}`);
      }

      if (!userOrders || userOrders.length === 0) {
        throw new Error('No orders available for processing. Only orders with successful payment from today can be sent to the kiosk.');
      }

      console.log('📋 Processing orders:', {
        userCount: userOrders.length,
        userId: userId,
        kioskId: qrData.kiosk_id,
        userFields: Object.keys(currentUser)
      });

      // Call the QR scan API with detailed logging and user data
      const result = await qrAPI.scanQR(qrData, token, {
        user_id: userId,
        username: currentUser.username || currentUser.name,
        role: currentUser.role || 'customer',
        // Include all user fields for debugging
        ...currentUser
      });
      
      console.log('✅ QR Scan Result:', result);

      if (result && result.success) {
        showToast.success('Your bill has been sent to the kiosk for printing.');

        // Navigate back after successful scan
        setTimeout(() => {
          if (navigation && navigation.goBack) {
            navigation.goBack();
          }
        }, 2000);
      } else {
        // Handle API failure - classify using the raw message internally, but
        // never display raw API/error text to the user (see catch block below).
        const errorMsg = result?.message || result?.error || '';
        console.error('QR Scan API failed:', errorMsg);

        if (errorMsg.includes('No confirmed orders found') || errorMsg.includes('no orders available')) {
          showToast.info('No orders with successful payment found for today.');
        } else {
          showToast.error('Unable to send your bill right now. Please try again.');
        }
      }

    } catch (error) {
      console.error('QR Scanner Error:', error);

      // Classify using the raw error text internally only - the displayed
      // message is always one of the fixed, friendly strings below, never the
      // raw exception/API text.
      const rawMessage = (error?.message || (typeof error === 'string' ? error : '')) || '';

      if (rawMessage.includes('Duplicate print job') || rawMessage.includes('existing job')) {
        showToast.info('Your bill is already being sent. Please wait for it to finish.');
      } else if (rawMessage.includes('No printable orders found') || rawMessage.includes('No confirmed orders found')) {
        showToast.info('No orders with successful payment found for today.');
      } else if (rawMessage.includes('Invalid QR code')) {
        showToast.error("This QR code isn't valid. Please scan the kiosk's QR code.");
      } else if (rawMessage.includes('Network') || rawMessage.includes('fetch')) {
        showToast.error('Please check your internet connection and try again.');
      } else {
        showToast.error('Unable to send your bill right now. Please try again.');
      }

      // Log the full error for debugging
      console.error('Full error details:', {
        message: rawMessage,
        originalError: error,
        stack: error.stack
      });
    }

    // Reset scan state after a delay
    setTimeout(() => {
      setScanned(false);
    }, 3000);
  };

  const resetScanner = () => {
    setScanned(false);
  };

  const renderPermissionRequest = () => (
    <View style={styles.permissionContainer}>
      <View style={styles.permissionIconWrap}>
        <MaterialCommunityIcons name="camera-outline" size={40} color={colors.primary} />
      </View>
      <Text style={styles.permissionTitle}>Camera Permission Required</Text>
      <Text style={styles.permissionText}>
        We need access to your camera to scan QR codes at the canteen pickup counter.
      </Text>
      <TouchableOpacity style={styles.primaryButton} onPress={getCameraPermissions} activeOpacity={0.85}>
        <Text style={styles.primaryButtonText}>Grant Permission</Text>
      </TouchableOpacity>
    </View>
  );

  const renderCameraView = () => (
    <View style={styles.cameraContainer}>
      <CameraView
        style={styles.camera}
        facing="back"
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
        barcodeScannerSettings={{
          barcodeTypes: ['qr'],
        }}
      />
      
      {/* Overlay */}
      <View style={styles.overlay}>
        <View style={styles.overlayTop} />
        <View style={styles.overlayMiddle}>
          <View style={styles.overlaySide} />
          <View style={styles.scanArea}>
            <View style={[styles.corner, styles.topLeft]} />
            <View style={[styles.corner, styles.topRight]} />
            <View style={[styles.corner, styles.bottomLeft]} />
            <View style={[styles.corner, styles.bottomRight]} />
          </View>
          <View style={styles.overlaySide} />
        </View>
        <View style={styles.overlayBottom}>
          <Text style={styles.instructionText} numberOfLines={1}>
            Align the QR code within the frame
          </Text>
          {loading && (
            <View style={styles.inlineLoadingRow}>
              <EnhancedQRLoader
                size="small"
                text="Processing QR code..."
                subText="Analyzing the scanned code"
              />
            </View>
          )}
          {scanned && !loading && (
            <TouchableOpacity style={styles.resetButton} onPress={resetScanner} activeOpacity={0.85}>
              <Text style={styles.resetButtonText}>Scan Again</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );

  const renderInstructions = () => (
    <View style={styles.instructionsCard}>
      <View style={styles.instructionsTitleRow}>
        <MaterialCommunityIcons name="qrcode-scan" size={18} color={colors.primary} />
        <Text style={styles.instructionsTitle}>QR Scanner</Text>
      </View>

      <View style={styles.kioskBadge}>
        <Text style={styles.kioskBadgeIcon}>🖨️</Text>
        <Text style={styles.categoryTitle}>Billing Kiosk</Text>
      </View>

      <View style={styles.instructionCategory}>
        {[
          'Find the billing kiosk with QR display',
          "Scan the kiosk QR to print today's bills",
          'Your pending orders will be printed automatically',
        ].map((step, index) => (
          <View key={index} style={styles.instructionStep}>
            <View style={styles.stepNumberBadge}>
              <Text style={styles.stepNumberText}>{index + 1}</Text>
            </View>
            <Text style={styles.stepText}>{step}</Text>
          </View>
        ))}
      </View>
    </View>
  );

  if (hasPermission === null) {
    return (
      <View style={styles.loadingContainer}>
        <EnhancedQRLoader 
          size="large" 
          text="Requesting camera permission..."
          subText="Please allow camera access to scan QR codes"
        />
      </View>
    );
  }

  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity
        onPress={() => navigation.goBack()}
        style={styles.backButton}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <MaterialCommunityIcons name="arrow-left" size={22} color={colors.text} />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>Scan QR Code</Text>
    </View>
  );

  if (hasPermission === false) {
    return (
      <SafeAreaView style={styles.container}>
        {renderHeader()}
        {renderPermissionRequest()}
        <CraveoBottomNav navigation={navigation} currentRoute="QRScanner" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {renderHeader()}
      {renderCameraView()}
      {renderInstructions()}
      <CraveoBottomNav navigation={navigation} currentRoute="QRScanner" />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.background,
    elevation: 2,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    height: 60,
  },
  backButton: {
    padding: spacing.xs,
    width: 40,
  },
  headerTitle: {
    fontSize: fontSize.lg,
    fontWeight: 'bold',
    color: colors.text,
    flex: 1,
    textAlign: 'center',
    marginRight: 40,
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  permissionIconWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: `${colors.primary}1A`,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  permissionTitle: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  permissionText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.xl,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: borderRadius.round,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.xl,
    elevation: 3,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  primaryButtonText: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.white,
  },
  cameraContainer: {
    flex: 1,
    position: 'relative',
  },
  camera: {
    flex: 1,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  overlayTop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  overlayMiddle: {
    flexDirection: 'row',
    height: 220,
  },
  overlaySide: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  scanArea: {
    width: 220,
    height: 220,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderColor: colors.primary,
  },
  topLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 3,
    borderLeftWidth: 3,
  },
  topRight: {
    top: 0,
    right: 0,
    borderTopWidth: 3,
    borderRightWidth: 3,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 3,
    borderRightWidth: 3,
  },
  overlayBottom: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  instructionText: {
    color: colors.white,
    fontSize: fontSize.sm,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  inlineLoadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.md,
  },
  resetButton: {
    marginTop: spacing.md,
    backgroundColor: colors.white,
    borderRadius: borderRadius.round,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xl,
  },
  resetButtonText: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.primary,
  },
  instructionsCard: {
    margin: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: 18,
    padding: spacing.md,
    elevation: 4,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  instructionsTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: spacing.md,
  },
  instructionsTitle: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.text,
  },
  kioskBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: `${colors.primary}1A`,
    borderRadius: borderRadius.round,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    marginBottom: spacing.md,
  },
  kioskBadgeIcon: {
    fontSize: fontSize.sm,
  },
  categoryTitle: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: colors.primary,
  },
  instructionCategory: {
    gap: spacing.sm,
  },
  instructionStep: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepNumberBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: `${colors.primary}1A`,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  stepNumberText: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    color: colors.primary,
  },
  stepText: {
    fontSize: fontSize.md,
    color: colors.text,
    flex: 1,
    lineHeight: 20,
  },
});

export default QRScannerScreen;

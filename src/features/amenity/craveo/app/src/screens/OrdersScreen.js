import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import {
  Text,
  Title,
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useDispatch, useSelector } from 'react-redux';
import { useToast } from '../contexts/ToastContext';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  fetchOrdersStart,
  fetchOrdersSuccess,
  fetchOrdersFailure,
} from '../redux/slices/orderSlice';
import { orderAPI } from '../services/api';
import OrderCard from '../components/OrderCard';
import CraveoBottomNav from '../components/CraveoBottomNav';
import { OrdersLoader } from '../components/SpecializedLoaders';
import { EnhancedOrdersLoader } from '../components/EnhancedLoaders';
import { colors, spacing, fontSize, borderRadius } from '../constants/theme';
import { formatDate } from '../utils/helpers';
import { formatTimestamptzToIST, getISTWallClockDate } from '../utils/timezoneUtils';
import { fonts } from '../../../../../../theme';

const OrdersScreen = ({ navigation }) => {
  const [selectedTab, setSelectedTab] = useState('pending');
  const [refreshing, setRefreshing] = useState(false);
  const [failedOrders, setFailedOrders] = useState([]);

  const dispatch = useDispatch();
  const { token, user, loading: authLoading } = useSelector(state => state.auth);
  const { pendingOrders, completedOrders, loading, error } = useSelector(state => state.orders);
  const { showSuccess, showError, showInfo } = useToast();

  const getCurrentOrders = () => {
    switch (selectedTab) {
      case 'pending':
        return pendingOrders;
      case 'completed':
        return completedOrders;
      case 'failed':
        return failedOrders;
      default:
        return pendingOrders;
    }
  };

  const currentOrders = getCurrentOrders();

  useEffect(() => {
    console.log('📊 OrdersScreen useEffect - Auth loading:', authLoading);
    console.log('📊 OrdersScreen useEffect - User:', user);
    console.log('📊 OrdersScreen useEffect - Token:', !!token);
    
    // Only fetch orders if user is available and not loading
    if (!authLoading && (user?.user_id || user?.id)) {
      console.log('✅ Conditions met, fetching orders...');
      fetchOrders();
    } else {
      console.log('⏳ Waiting for authentication to complete...');
    }
  }, [fetchOrders, user?.user_id, user?.id, authLoading]); // Add authLoading to dependencies

  const fetchOrders = useCallback(async () => {
    try {
      dispatch(fetchOrdersStart());
      console.log('🔍 Fetching orders with token:', token);
      console.log('👤 Current user:', user);
      
      const userId = user?.user_id || user?.id;
      console.log('🆔 Using user ID for orders:', userId);
      
      if (!userId) {
        console.log('❌ No user ID found, cannot fetch user-specific orders');
        dispatch(fetchOrdersFailure('User not logged in'));
        return;
      }
      
      const response = await orderAPI.getOrders(token, userId);
      
      console.log('📦 Orders response:', response);

      if (response.success) {
        console.log('✅ Orders fetched successfully:', response.orders);
        console.log('📊 Order details:', response.orders.map(order => ({
          order_id: order.order_id,
          status: order.order_status,
          items_count: order.order_items?.length || 0,
          created_at: order.created_at
        })));
        
        // Sort orders by created_at in descending order (recent first)
        const sortOrdersByDate = (orders) => {
          return orders.sort((a, b) => {
            const dateA = new Date(a.created_at);
            const dateB = new Date(b.created_at);
            return dateB.getTime() - dateA.getTime(); // Recent first
          });
        };
        
        const pendingOrders = sortOrdersByDate(
          response.orders.filter(order => 
            (order.order_status === 'PENDING' || order.order_status === 'CONFIRMED') &&
            order.payment_status !== 'failed' && 
            order.payment_status !== 'failed_stock_released'
          )
        );
        const completedOrders = sortOrdersByDate(
          response.orders.filter(order => 
            (order.order_status === 'COMPLETED' || order.order_status === 'DELIVERED') &&
            order.payment_status !== 'failed' && 
            order.payment_status !== 'failed_stock_released'
          )
        );
        
        dispatch(fetchOrdersSuccess({
          pending: pendingOrders,
          completed: completedOrders,
        }));

        // Fetch failed orders separately using supabaseAPI
        try {
          console.log('🔍 Fetching failed orders for user:', userId);
          const failedResponse = await orderAPI.getUserFailedOrders(userId);
          if (failedResponse.success) {
            console.log('✅ Failed orders fetched:', failedResponse.data.length);
            const sortedFailedOrders = sortOrdersByDate(failedResponse.data || []);
            setFailedOrders(sortedFailedOrders);
          } else {
            console.log('⚠️ No failed orders or error:', failedResponse.error);
            setFailedOrders([]);
          }
        } catch (failedError) {
          console.error('❌ Error fetching failed orders:', failedError);
          setFailedOrders([]);
        }
      } else {
        console.log('❌ Failed to fetch orders:', response.message);
        dispatch(fetchOrdersFailure(response.message || 'Failed to fetch orders'));
      }
    } catch (error) {
      console.error('❌ Error fetching orders:', error);
      dispatch(fetchOrdersFailure(error.message || 'Failed to fetch orders'));
    }
  }, [dispatch, token, user?.user_id, user?.id]);  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchOrders();
    setRefreshing(false);
  }, [fetchOrders]);

  const handleOrderPress = (order) => {
    navigation.navigate('OrderDetails', { orderId: order.order_id });
  };

  // Helper function to group orders by date (using IST)
  const groupOrdersByDate = (orders) => {
    const grouped = [];
    let currentDateKey = null;
    
    console.log('📅 GROUPING: Total orders to process:', orders.length);
    
    orders.forEach((order, index) => {
      // IST wall-clock fields, correct regardless of the device's own timezone
      const istDate = getISTWallClockDate(order.created_at);

      // Create unique date key using simple date string for reliable comparison
      const orderDateKey = istDate.toDateString(); // Fri Dec 29 2023 format

      // Only add date separator if we encounter a new date
      if (orderDateKey !== currentDateKey) {
        // Add date separator
        grouped.push({
          type: 'date',
          date: order.created_at, // Pass original timestamp for formatDateHeader
          fullDate: istDate, // Store the IST date object for comparison
          id: `date-separator-${orderDateKey}`, // Unique key
        });
        currentDateKey = orderDateKey;
      }
      
      // Add order item with unique key
      grouped.push({
        type: 'order',
        ...order,
        id: `order-${order.order_id || index}`, // Ensure unique key for each order
      });
    });
    
    return grouped;
  };

  const renderOrderItem = ({ item }) => {
    if (item.type === 'date') {
      return (
        <View style={styles.dateSeparator}>
          <Text style={styles.dateText}>
            {formatDateHeader(item.date, item.fullDate)}
          </Text>
        </View>
      );
    }
    
    return (
      <OrderCard
        order={item}
        onPress={() => handleOrderPress(item)}
      />
    );
  };

  // Helper function to format date header (using IST)
  const formatDateHeader = (dateString, fullDate = null) => {
    try {
      // orderDateIST already has IST baked into its local calendar fields (from
      // getISTWallClockDate, see groupOrdersByDate above), so it must be read
      // with plain local getters/toLocaleDateString below - NOT re-converted
      // via getISTWallClockDate or an explicit timeZone option, which would
      // shift it a second time.
      const orderDateIST = fullDate || getISTWallClockDate(dateString);
      const todayIST = getISTWallClockDate();
      const yesterdayIST = new Date(todayIST.getTime() - (24 * 60 * 60 * 1000));

      // Compare dates using date strings in IST timezone
      const orderDateStr = orderDateIST.toDateString();
      const todayDateStr = todayIST.toDateString();
      const yesterdayDateStr = yesterdayIST.toDateString();

      if (orderDateStr === todayDateStr) {
        return 'Today';
      }

      if (orderDateStr === yesterdayDateStr) {
        return 'Yesterday';
      }

      // For any other date, show the formatted date
      return orderDateIST.toLocaleDateString('en-IN', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch (error) {
      console.error('❌ Error in formatDateHeader:', error);
      return 'Unknown Date';
    }
  };

  const renderEmptyState = () => {
    let message = '';
    let subMessage = '';
    let icon = 'receipt-text-outline';

    switch (selectedTab) {
      case 'pending':
        message = 'No pending orders';
        subMessage = 'Your pending orders will appear here';
        icon = 'clock-outline';
        break;
      case 'completed':
        message = 'No completed orders';
        subMessage = 'Your completed orders will appear here';
        icon = 'check-circle-outline';
        break;
      case 'failed':
        message = 'No failed orders';
        subMessage = 'Great! All your payments have been successful';
        icon = 'alert-circle-outline';
        break;
      default:
        message = 'No orders found';
    }

    return (
      <View style={styles.emptyState}>
        <View style={styles.emptyStateIconWrap}>
          <MaterialCommunityIcons name={icon} size={32} color={colors.primary} />
        </View>
        <Text style={styles.emptyStateText}>{message}</Text>
        <Text style={styles.emptyStateSubText}>{subMessage}</Text>
      </View>
    );
  };

  if ((loading || authLoading) && !refreshing) {
    return (
      <SafeAreaView style={styles.container}>
        <EnhancedOrdersLoader
          size="large"
          text={authLoading ? 'Authenticating user...' : 'Fetching your order history...'}
        />
        <CraveoBottomNav navigation={navigation} currentRoute="Orders" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Title style={styles.title}>My Orders</Title>
      </View>

      <View style={styles.tabContainer}>
        {[
          { value: 'pending', label: 'Pending', count: pendingOrders.length, icon: 'clock-outline' },
          { value: 'completed', label: 'Done', count: completedOrders.length, icon: 'check-circle-outline' },
          { value: 'failed', label: 'Failed', count: failedOrders.length, icon: 'alert-circle-outline' },
        ].map((tab) => {
          const active = selectedTab === tab.value;
          return (
            <TouchableOpacity
              key={tab.value}
              style={[styles.tabPill, active && styles.tabPillActive]}
              onPress={() => setSelectedTab(tab.value)}
              activeOpacity={0.8}
            >
              <MaterialCommunityIcons
                name={tab.icon}
                size={16}
                color={active ? colors.white : colors.textSecondary}
              />
              <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>
                {tab.label} ({tab.count})
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <FlatList
        data={groupOrdersByDate(currentOrders)}
        renderItem={renderOrderItem}
        keyExtractor={(item) => item.id || item.order_id?.toString() || Math.random().toString()}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={renderEmptyState}
      />

      <CraveoBottomNav navigation={navigation} currentRoute="Orders" />
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
  loadingText: {
    marginTop: spacing.md,
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
  header: {
    padding: spacing.md,
    paddingBottom: spacing.sm,
  },
  title: {
    fontSize: fontSize.xl,
    fontFamily: fonts.bold,
    color: colors.text,
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    gap: spacing.xs,
  },
  tabPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.round,
    backgroundColor: colors.surface,
    elevation: 1,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
  },
  tabPillActive: {
    backgroundColor: colors.primary,
    elevation: 3,
    shadowColor: colors.primary,
    shadowOpacity: 0.3,
  },
  tabLabel: {
    fontSize: fontSize.xs,
    fontFamily: fonts.semibold,
    color: colors.textSecondary,
  },
  tabLabelActive: {
    color: colors.white,
    fontFamily: fonts.bold,
  },
  listContainer: {
    padding: spacing.md,
    paddingTop: 0,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xxl,
  },
  emptyStateIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: `${colors.primary}1A`,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  emptyStateText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
    fontFamily: fonts.regular,
  },
  emptyStateSubText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xs,
    opacity: 0.7,
    fontFamily: fonts.regular,
  },
  dateSeparator: {
    alignItems: 'center',
    marginVertical: spacing.md,
  },
  dateText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    fontFamily: fonts.medium,
  },
});

export default OrdersScreen;

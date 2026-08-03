import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Modal,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import Icon from 'react-native-vector-icons/Ionicons';
import { staffAPI } from '../../services';

const StaffHistoryScreen = () => {
  const user = useSelector(state => state.auth.user);
  
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDate, setSelectedDate] = useState('today');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [customDate, setCustomDate] = useState(new Date());
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showOrderDetail, setShowOrderDetail] = useState(false);

  useEffect(() => {
    fetchOrders();
  }, []);

  useEffect(() => {
    filterOrdersByDate();
  }, [selectedDate, customDate, orders]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const response = await staffAPI.getStaffOrderHistory(user?.user_id);
      
      if (response.success && response.data) {
        // Sort orders by date (newest first)
        const sortedOrders = response.data.sort((a, b) => 
          new Date(b.order_date) - new Date(a.order_date)
        );
        setOrders(sortedOrders);
      }
    } catch (error) {
      console.error('Error fetching order history:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchOrders();
  };

  const filterOrdersByDate = () => {
    const now = new Date();
    let filtered = [];

    switch (selectedDate) {
      case 'today':
        filtered = orders.filter(order => {
          const orderDate = new Date(order.order_date);
          return orderDate.toDateString() === now.toDateString();
        });
        break;
      
      case 'yesterday':
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        filtered = orders.filter(order => {
          const orderDate = new Date(order.order_date);
          return orderDate.toDateString() === yesterday.toDateString();
        });
        break;
      
      case 'week':
        const weekAgo = new Date(now);
        weekAgo.setDate(weekAgo.getDate() - 7);
        filtered = orders.filter(order => {
          const orderDate = new Date(order.order_date);
          return orderDate >= weekAgo;
        });
        break;
      
      case 'month':
        const monthAgo = new Date(now);
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        filtered = orders.filter(order => {
          const orderDate = new Date(order.order_date);
          return orderDate >= monthAgo;
        });
        break;
      
      case 'custom':
        filtered = orders.filter(order => {
          const orderDate = new Date(order.order_date);
          return orderDate.toDateString() === customDate.toDateString();
        });
        break;
      
      default:
        filtered = orders;
    }

    setFilteredOrders(filtered);
  };

  const convertToIST = (dateString) => {
    // Parse the date and add IST offset (UTC+5:30)
    const date = new Date(dateString);
    // Get the time in milliseconds and add 5 hours 30 minutes offset
    const istOffset = 5.5 * 60 * 60 * 1000; // 5.5 hours in milliseconds
    const utcTime = date.getTime();
    const istTime = new Date(utcTime + istOffset);
    return istTime;
  };

  const formatDate = (dateString) => {
    // Convert to IST
    const istDate = convertToIST(dateString);
    const today = new Date();
    const istToday = convertToIST(today.toISOString());
    
    const yesterday = new Date(istToday);
    yesterday.setDate(yesterday.getDate() - 1);

    // Compare dates
    const orderDateStr = istDate.toISOString().split('T')[0];
    const todayStr = istToday.toISOString().split('T')[0];
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    if (orderDateStr === todayStr) {
      return 'Today';
    } else if (orderDateStr === yesterdayStr) {
      return 'Yesterday';
    } else {
      // Format as DD MMM YYYY
      const day = istDate.getDate().toString().padStart(2, '0');
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const month = months[istDate.getMonth()];
      const year = istDate.getFullYear();
      return `${day} ${month} ${year}`;
    }
  };

  const formatTime = (dateString) => {
    // Convert to IST
    const istDate = convertToIST(dateString);
    
    let hours = istDate.getHours();
    const minutes = istDate.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    
    hours = hours % 12;
    hours = hours ? hours : 12; // 0 should be 12
    const hoursStr = hours.toString().padStart(2, '0');
    
    return `${hoursStr}:${minutes} ${ampm}`;
  };

  const getDateFilterLabel = () => {
    switch (selectedDate) {
      case 'today': return 'Today';
      case 'yesterday': return 'Yesterday';
      case 'week': return 'Last 7 Days';
      case 'month': return 'Last Month';
      case 'custom': return customDate.toLocaleDateString('en-IN', { 
        day: '2-digit', 
        month: 'short' 
      });
      default: return 'All Time';
    }
  };

  const getTotalAmount = () => {
    return filteredOrders.reduce((sum, order) => sum + parseFloat(order.total_amount || 0), 0);
  };

  const getTotalOrders = () => {
    return filteredOrders.length;
  };

  const getCashOrders = () => {
    return filteredOrders.filter(order => order.payment_method === 'CASH').length;
  };

  const getUPIOrders = () => {
    return filteredOrders.filter(order => order.payment_method === 'UPI').length;
  };

  const getCashAmount = () => {
    return filteredOrders
      .filter(order => order.payment_method === 'CASH')
      .reduce((sum, order) => sum + parseFloat(order.total_amount || 0), 0);
  };

  const getUPIAmount = () => {
    return filteredOrders
      .filter(order => order.payment_method === 'UPI')
      .reduce((sum, order) => sum + parseFloat(order.total_amount || 0), 0);
  };

  const handleOrderPress = (order) => {
    setSelectedOrder(order);
    setShowOrderDetail(true);
  };

  const renderDateFilter = () => (
    <View style={styles.dateFilterContainer}>
      <Text style={styles.filterLabel}>Filter by Date:</Text>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.dateFilterScroll}
      >
        {['today', 'yesterday', 'week', 'month'].map((filter) => (
          <TouchableOpacity
            key={filter}
            style={[
              styles.dateFilterButton,
              selectedDate === filter && styles.dateFilterButtonActive
            ]}
            onPress={() => setSelectedDate(filter)}
          >
            <Text style={[
              styles.dateFilterText,
              selectedDate === filter && styles.dateFilterTextActive
            ]}>
              {filter === 'today' ? 'Today' : 
               filter === 'yesterday' ? 'Yesterday' : 
               filter === 'week' ? 'Last 7 Days' : 'Last Month'}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  const renderStatistics = () => (
    <View style={styles.statisticsContainer}>
      <View style={styles.statCard}>
        <Icon name="receipt" size={24} color="#235EAA" />
        <Text style={styles.statNumber}>{getTotalOrders()}</Text>
        <Text style={styles.statLabel}>Total Orders</Text>
      </View>
      
      <View style={styles.statCard}>
        <Icon name="cash" size={24} color="#4CAF50" />
        <Text style={styles.statNumber}>₹{getTotalAmount().toFixed(0)}</Text>
        <Text style={styles.statLabel}>Total Amount</Text>
      </View>
    </View>
  );

  const renderPaymentBreakdown = () => (
    <View style={styles.paymentBreakdown}>
      <View style={styles.paymentCard}>
        <View style={styles.paymentHeader}>
          <Icon name="cash-outline" size={20} color="#4CAF50" />
          <Text style={styles.paymentTitle}>Cash</Text>
        </View>
        <Text style={styles.paymentCount}>{getCashOrders()} orders</Text>
        <Text style={styles.paymentAmount}>₹{getCashAmount().toFixed(2)}</Text>
      </View>
      
      <View style={styles.paymentCard}>
        <View style={styles.paymentHeader}>
          <Icon name="card-outline" size={20} color="#2196F3" />
          <Text style={styles.paymentTitle}>UPI</Text>
        </View>
        <Text style={styles.paymentCount}>{getUPIOrders()} orders</Text>
        <Text style={styles.paymentAmount}>₹{getUPIAmount().toFixed(2)}</Text>
      </View>
    </View>
  );

  const renderOrderItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.orderCard}
      onPress={() => handleOrderPress(item)}
    >
      <View style={styles.orderHeader}>
        <View style={styles.orderIdSection}>
          <Text style={styles.orderIdLabel}>Order #{item.order_id}</Text>
          <View style={[
            styles.paymentBadge,
            item.payment_method === 'CASH' ? styles.cashBadge : styles.upiBadge
          ]}>
            <Icon 
              name={item.payment_method === 'CASH' ? 'cash' : 'card'} 
              size={12} 
              color="#fff" 
            />
            <Text style={styles.paymentBadgeText}>{item.payment_method}</Text>
          </View>
        </View>
        <Text style={styles.orderAmount}>₹{parseFloat(item.total_amount).toFixed(2)}</Text>
      </View>
      
      <View style={styles.orderMeta}>
        <View style={styles.metaItem}>
          <Icon name="calendar-outline" size={14} color="#666" />
          <Text style={styles.metaText}>{formatDate(item.order_date)}</Text>
        </View>
        <View style={styles.metaItem}>
          <Icon name="time-outline" size={14} color="#666" />
          <Text style={styles.metaText}>{formatTime(item.order_date)}</Text>
        </View>
      </View>

      {item.staff_notes && (
        <View style={styles.notesSection}>
          <Icon name="document-text-outline" size={14} color="#999" />
          <Text style={styles.notesText} numberOfLines={1}>{item.staff_notes}</Text>
        </View>
      )}

      <View style={styles.itemsPreview}>
        <Text style={styles.itemsPreviewText}>
          {item.order_items?.length || 0} item(s)
        </Text>
        <Icon name="chevron-forward" size={16} color="#999" />
      </View>
    </TouchableOpacity>
  );

  const renderOrderDetailModal = () => {
    if (!selectedOrder) return null;

    return (
      <Modal
        visible={showOrderDetail}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowOrderDetail(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Order Details</Text>
              <TouchableOpacity onPress={() => setShowOrderDetail(false)}>
                <Icon name="close" size={28} color="#333" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>Order ID</Text>
                <Text style={styles.detailValue}>#{selectedOrder.order_id}</Text>
              </View>

              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>Date & Time</Text>
                <Text style={styles.detailValue}>
                  {formatDate(selectedOrder.order_date)} at {formatTime(selectedOrder.order_date)}
                </Text>
              </View>

              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>Payment Method</Text>
                <View style={[
                  styles.paymentBadge,
                  selectedOrder.payment_method === 'CASH' ? styles.cashBadge : styles.upiBadge
                ]}>
                  <Icon 
                    name={selectedOrder.payment_method === 'CASH' ? 'cash' : 'card'} 
                    size={14} 
                    color="#fff" 
                  />
                  <Text style={styles.paymentBadgeText}>{selectedOrder.payment_method}</Text>
                </View>
              </View>

              {selectedOrder.staff_notes && (
                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Notes</Text>
                  <Text style={styles.detailValue}>{selectedOrder.staff_notes}</Text>
                </View>
              )}

              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>Order Items</Text>
                {selectedOrder.order_items?.map((item, index) => (
                  <View key={index} style={styles.orderItemRow}>
                    <Text style={styles.orderItemName}>{item.dish_name || 'Item'}</Text>
                    <Text style={styles.orderItemQuantity}>x{item.quantity}</Text>
                    <Text style={styles.orderItemPrice}>₹{parseFloat(item.price).toFixed(2)}</Text>
                  </View>
                ))}
              </View>

              <View style={styles.totalSection}>
                <Text style={styles.totalLabel}>Total Amount</Text>
                <Text style={styles.totalValue}>₹{parseFloat(selectedOrder.total_amount).toFixed(2)}</Text>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Order History</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#235EAA" />
          <Text style={styles.loadingText}>Loading history...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Order History</Text>
        <Text style={styles.headerSubtitle}>{getDateFilterLabel()}</Text>
      </View>

      <FlatList
        data={filteredOrders}
        renderItem={renderOrderItem}
        keyExtractor={(item) => item.order_id.toString()}
        ListHeaderComponent={
          <>
            {renderDateFilter()}
            {renderStatistics()}
            {renderPaymentBreakdown()}
            <View style={styles.ordersHeader}>
              <Text style={styles.ordersHeaderText}>Orders</Text>
            </View>
          </>
        }
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Icon name="receipt-outline" size={64} color="#CCC" />
            <Text style={styles.emptyText}>No orders found</Text>
            <Text style={styles.emptySubtext}>
              Orders will appear here once created
            </Text>
          </View>
        }
      />

      {renderOrderDetailModal()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#fff',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  listContent: {
    paddingBottom: 20,
  },
  dateFilterContainer: {
    backgroundColor: '#fff',
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  dateFilterScroll: {
    flexDirection: 'row',
  },
  dateFilterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  dateFilterButtonActive: {
    backgroundColor: '#235EAA',
    borderColor: '#235EAA',
  },
  dateFilterText: {
    fontSize: 13,
    color: '#666',
    fontWeight: '600',
  },
  dateFilterTextActive: {
    color: '#fff',
  },
  statisticsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 12,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  paymentBreakdown: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 12,
    gap: 12,
  },
  paymentCard: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 12,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  paymentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 6,
  },
  paymentTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  paymentCount: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  paymentAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  ordersHeader: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    marginBottom: 8,
  },
  ordersHeaderText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  orderCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 16,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  orderIdSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  orderIdLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  orderAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#235EAA',
  },
  paymentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  cashBadge: {
    backgroundColor: '#4CAF50',
  },
  upiBadge: {
    backgroundColor: '#2196F3',
  },
  paymentBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#fff',
  },
  orderMeta: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 8,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 13,
    color: '#666',
  },
  notesSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: 8,
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  notesText: {
    flex: 1,
    fontSize: 13,
    color: '#999',
    fontStyle: 'italic',
  },
  itemsPreview: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  itemsPreviewText: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: '600',
    color: '#999',
  },
  emptySubtext: {
    marginTop: 8,
    fontSize: 14,
    color: '#CCC',
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  modalBody: {
    padding: 20,
  },
  detailSection: {
    marginBottom: 20,
  },
  detailLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 6,
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  detailValue: {
    fontSize: 16,
    color: '#333',
  },
  orderItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  orderItemName: {
    flex: 1,
    fontSize: 14,
    color: '#333',
  },
  orderItemQuantity: {
    fontSize: 14,
    color: '#666',
    marginHorizontal: 12,
  },
  orderItemPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4CAF50',
    minWidth: 60,
    textAlign: 'right',
  },
  totalSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    marginTop: 16,
    borderTopWidth: 2,
    borderTopColor: '#e0e0e0',
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  totalValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#235EAA',
  },
});

export default StaffHistoryScreen;

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { staffAPI } from '../../services';

const StaffDashboardScreen = () => {
  const [statistics, setStatistics] = useState(null);
  const [dishStats, setDishStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch both statistics and dish data
      const [statsResponse, dishResponse] = await Promise.all([
        staffAPI.getTodayStatistics(),
        staffAPI.getDishStatistics(),
      ]);

      if (statsResponse.success) {
        setStatistics(statsResponse.data);
      }

      if (dishResponse.success) {
        setDishStats(dishResponse.data);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const renderStatCard = (icon, label, value, color) => (
    <View style={[styles.statCard, { borderLeftColor: color }]}>
      <Icon name={icon} size={32} color={color} />
      <View style={styles.statInfo}>
        <Text style={styles.statLabel}>{label}</Text>
        <Text style={styles.statValue}>{value}</Text>
      </View>
    </View>
  );

  const renderDishItem = ({ item }) => (
    <View style={styles.dishStatItem}>
      <View style={styles.dishStatInfo}>
        <Text style={styles.dishStatName}>{item.name}</Text>
        <Text style={styles.dishStatPrice}>₹{parseFloat(item.price).toFixed(2)}</Text>
      </View>
      <View style={styles.dishStatNumbers}>
        <Text style={styles.dishStatQuantity}>× {item.totalQuantity}</Text>
        <Text style={styles.dishStatRevenue}>₹{item.totalRevenue.toFixed(2)}</Text>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#235EAA" />
        <Text style={styles.loadingText}>Loading dashboard...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Dashboard</Text>
        <Text style={styles.headerSubtitle}>Today's Performance</Text>
      </View>

      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Statistics Cards */}
        {statistics && (
          <View style={styles.statsContainer}>
            {renderStatCard(
              'cart',
              'Total Orders',
              statistics.totalOrders.toString(),
              '#235EAA'
            )}
            
            {renderStatCard(
              'cash',
              'Total Revenue',
              `₹${statistics.totalRevenue.toFixed(2)}`,
              '#4CAF50'
            )}

            <View style={styles.paymentStatsRow}>
              <View style={[styles.paymentStatCard, { flex: 1, marginRight: 8 }]}>
                <Icon name="card" size={24} color="#2196F3" />
                <Text style={styles.paymentStatLabel}>UPI</Text>
                <Text style={styles.paymentStatCount}>{statistics.upiCount}</Text>
                <Text style={styles.paymentStatAmount}>₹{statistics.upiAmount.toFixed(2)}</Text>
              </View>

              <View style={[styles.paymentStatCard, { flex: 1, marginLeft: 8 }]}>
                <Icon name="cash" size={24} color="#FF9800" />
                <Text style={styles.paymentStatLabel}>Cash</Text>
                <Text style={styles.paymentStatCount}>{statistics.cashCount}</Text>
                <Text style={styles.paymentStatAmount}>₹{statistics.cashAmount.toFixed(2)}</Text>
              </View>
            </View>
          </View>
        )}

        {/* Dish Statistics */}
        <View style={styles.dishStatsSection}>
          <View style={styles.sectionHeader}>
            <Icon name="restaurant" size={24} color="#235EAA" />
            <Text style={styles.sectionTitle}>Dishes Ordered Today</Text>
          </View>

          {dishStats.length > 0 ? (
            <FlatList
              data={dishStats}
              keyExtractor={(item) => item.dish_id.toString()}
              renderItem={renderDishItem}
              scrollEnabled={false}
              contentContainerStyle={styles.dishStatsList}
            />
          ) : (
            <View style={styles.emptyContainer}>
              <Icon name="alert-circle" size={48} color="#CCC" />
              <Text style={styles.emptyText}>No orders yet today</Text>
            </View>
          )}
        </View>

        {/* Refresh Button */}
        <TouchableOpacity style={styles.refreshButton} onPress={fetchData}>
          <Icon name="refresh" size={20} color="#FFF" />
          <Text style={styles.refreshButtonText}>Refresh Data</Text>
        </TouchableOpacity>

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
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
  header: {
    backgroundColor: '#235EAA',
    padding: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFF',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#D7E6F7',
    marginTop: 4,
  },
  statsContainer: {
    padding: 16,
  },
  statCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    elevation: 2,
    borderLeftWidth: 4,
  },
  statInfo: {
    marginLeft: 16,
    flex: 1,
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  paymentStatsRow: {
    flexDirection: 'row',
  },
  paymentStatCard: {
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 8,
    elevation: 2,
    alignItems: 'center',
  },
  paymentStatLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    marginBottom: 4,
  },
  paymentStatCount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  paymentStatAmount: {
    fontSize: 16,
    color: '#4CAF50',
    fontWeight: '600',
  },
  dishStatsSection: {
    padding: 16,
    paddingTop: 0,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 8,
  },
  dishStatsList: {
    paddingBottom: 0,
  },
  dishStatItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
    elevation: 1,
  },
  dishStatInfo: {
    flex: 1,
  },
  dishStatName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  dishStatPrice: {
    fontSize: 14,
    color: '#666',
  },
  dishStatNumbers: {
    alignItems: 'flex-end',
  },
  dishStatQuantity: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#235EAA',
    marginBottom: 4,
  },
  dishStatRevenue: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 16,
    color: '#999',
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#235EAA',
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 8,
    gap: 8,
  },
  refreshButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default StaffDashboardScreen;

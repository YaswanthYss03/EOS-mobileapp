import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector, useDispatch } from 'react-redux';
import { useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { menuAPI, staffAPI } from '../../services';
import { logout } from '../../redux/slices/authSlice';
import CustomAlert from '../../components/CustomAlert';
import { fonts } from '../../../../../../../theme';

const STORAGE_KEY = '@staff_selected_dishes';

const StaffOrderScreen = ({ navigation }) => {
  const user = useSelector(state => state.auth.user);
  const dispatch = useDispatch();
  
  const [dishes, setDishes] = useState([]);
  const [selectedDishIds, setSelectedDishIds] = useState(new Set());
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  
  // Custom Alert States
  const [alertConfig, setAlertConfig] = useState({
    visible: false,
    title: '',
    message: '',
    type: 'info',
    onConfirm: null,
    onCancel: null,
  });

  // Load selected dishes when screen is focused
  useFocusEffect(
    React.useCallback(() => {
      loadSelectedDishes();
    }, [])
  );

  useEffect(() => {
    fetchDishes();
  }, []);

  const loadSelectedDishes = async () => {
    try {
      const savedSelections = await AsyncStorage.getItem(STORAGE_KEY);
      if (savedSelections) {
        const selections = JSON.parse(savedSelections);
        setSelectedDishIds(new Set(selections));
      }
    } catch (error) {
      console.error('Error loading selected dishes:', error);
    }
  };

  const fetchDishes = async () => {
    try {
      setLoading(true);
      const response = await menuAPI.getAllDishes();
      
      if (response.success && response.data) {
        setDishes(response.data);
        
        // Extract unique categories from the dish_category object
        const categorySet = new Set();
        response.data.forEach(dish => {
          if (dish.category?.dish_category_name) {
            categorySet.add(dish.category.dish_category_name);
          } else if (dish.dish_category?.dish_category_name) {
            categorySet.add(dish.dish_category.dish_category_name);
          }
        });
        const cats = ['All', ...Array.from(categorySet)];
        setCategories(cats);
        console.log('Categories loaded:', cats);
      }
    } catch (error) {
      console.error('Error fetching dishes:', error);
      showAlert('Error', 'Failed to load dishes', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Custom Alert helper
  const showAlert = (title, message, type = 'info', onConfirm = null, onCancel = null) => {
    setAlertConfig({
      visible: true,
      title,
      message,
      type,
      onConfirm: onConfirm || (() => hideAlert()),
      onCancel: onCancel || (() => hideAlert()),
    });
  };

  const hideAlert = () => {
    setAlertConfig(prev => ({ ...prev, visible: false }));
  };

  // Logout function
  const handleLogout = () => {
    showAlert(
      'Logout',
      'Are you sure you want to logout?',
      'confirm',
      async () => {
        hideAlert();
        try {
          await dispatch(logout()).unwrap();
          navigation.replace('Auth');
        } catch (error) {
          console.error('Logout error:', error);
        }
      },
      () => hideAlert()
    );
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchDishes();
  };

  const filteredDishes = dishes.filter(dish => {
    // Filter by selected dishes (from DishSelectionScreen)
    const isSelected = selectedDishIds.size === 0 || selectedDishIds.has(dish.dish_id);
    
    // Get category name from either category or dish_category object
    const dishCategoryName = dish.category?.dish_category_name || dish.dish_category?.dish_category_name;
    
    const matchesCategory = selectedCategory === 'All' || dishCategoryName === selectedCategory;
    const matchesSearch = dish.name.toLowerCase().includes(searchQuery.toLowerCase());
    return isSelected && matchesCategory && matchesSearch;
  });

  const addToCart = (dish) => {
    setCart(prev => ({
      ...prev,
      [dish.dish_id]: {
        ...dish,
        quantity: (prev[dish.dish_id]?.quantity || 0) + 1,
      }
    }));
  };

  const removeFromCart = (dishId) => {
    setCart(prev => {
      const newCart = { ...prev };
      if (newCart[dishId].quantity > 1) {
        newCart[dishId].quantity -= 1;
      } else {
        delete newCart[dishId];
      }
      return newCart;
    });
  };

  const getCartTotal = () => {
    return Object.values(cart).reduce((total, item) => {
      return total + (parseFloat(item.price) * item.quantity);
    }, 0);
  };

  const getCartItemsCount = () => {
    return Object.values(cart).reduce((total, item) => total + item.quantity, 0);
  };

  const handleCreateOrder = async () => {
    if (Object.keys(cart).length === 0) {
      showAlert('Empty Cart', 'Please add items to create an order', 'warning');
      return;
    }

    showAlert(
      'Confirm Order',
      `Total: ₹${getCartTotal().toFixed(2)}\nPayment: ${paymentMethod}\n\nCreate this order?`,
      'confirm',
      async () => {
        hideAlert();
        try {
          setSubmitting(true);

          const orderData = {
            items: Object.values(cart).map(item => ({
              dish_id: item.dish_id,
              quantity: item.quantity,
              price: item.price,
              dish_category_id: item.dish_category_id,
            })),
            totalAmount: getCartTotal(),
            paymentMethod: paymentMethod,
            isParcel: false,
          };

          const response = await staffAPI.createStaffOrder(orderData, user.user_id);

          if (response.success) {
            showAlert(
              'Success',
              `Order #${response.data.order_id} created successfully!\nTotal: ₹${response.data.total_amount}`,
              'success',
              () => {
                hideAlert();
                setCart({});
              }
            );
          } else {
            throw new Error(response.error || 'Failed to create order');
          }
        } catch (error) {
          console.error('Error creating order:', error);
          showAlert('Error', error.message || 'Failed to create order', 'error');
        } finally {
          setSubmitting(false);
        }
      },
      () => hideAlert()
    );
  };

  const renderDishItem = ({ item }) => {
    const inCart = cart[item.dish_id];
    const quantity = inCart?.quantity || 0;

    return (
      <View style={styles.dishItem}>
        <View style={styles.dishInfo}>
          <Text style={styles.dishName}>{item.name}</Text>
          <Text style={styles.dishPrice}>₹{parseFloat(item.price).toFixed(2)}</Text>
          {item.dish_category && (
            <Text style={styles.dishCategory}>{item.dish_category.dish_category_name}</Text>
          )}
        </View>
        
        <View style={styles.quantityControl}>
          {quantity > 0 ? (
            <>
              <TouchableOpacity 
                style={styles.quantityButton}
                onPress={() => removeFromCart(item.dish_id)}
              >
                <Icon name="remove" size={20} color="#FFF" />
              </TouchableOpacity>
              
              <Text style={styles.quantityText}>{quantity}</Text>
              
              <TouchableOpacity 
                style={styles.quantityButton}
                onPress={() => addToCart(item)}
              >
                <Icon name="add" size={20} color="#FFF" />
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity 
              style={styles.addButton}
              onPress={() => addToCart(item)}
            >
              <Text style={styles.addButtonText}>ADD</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#235EAA" />
        <Text style={styles.loadingText}>Loading dishes...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>Create Order</Text>
          <Text style={styles.headerSubtitle}>Staff: {user?.name || user?.username}</Text>
        </View>
        <TouchableOpacity 
          style={styles.logoutButton}
          onPress={handleLogout}
        >
          <Icon name="log-out-outline" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <Icon name="search" size={20} color="#999" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search dishes..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#999"
        />
      </View>

      {/* Categories */}
      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        data={categories}
        keyExtractor={(item) => item}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[
              styles.categoryChip,
              selectedCategory === item && styles.categoryChipActive
            ]}
            onPress={() => setSelectedCategory(item)}
          >
            <Text style={[
              styles.categoryText,
              selectedCategory === item && styles.categoryTextActive
            ]}>
              {item}
            </Text>
          </TouchableOpacity>
        )}
        style={styles.categoryList}
      />

      {/* Payment Method Selector */}
      <View style={styles.paymentSelector}>
        <TouchableOpacity
          style={[styles.paymentButton, paymentMethod === 'CASH' && styles.paymentButtonActive]}
          onPress={() => setPaymentMethod('CASH')}
        >
          <Icon name="cash" size={20} color={paymentMethod === 'CASH' ? '#FFF' : '#666'} />
          <Text style={[styles.paymentText, paymentMethod === 'CASH' && styles.paymentTextActive]}>
            Cash
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.paymentButton, paymentMethod === 'UPI' && styles.paymentButtonActive]}
          onPress={() => setPaymentMethod('UPI')}
        >
          <Icon name="card" size={20} color={paymentMethod === 'UPI' ? '#FFF' : '#666'} />
          <Text style={[styles.paymentText, paymentMethod === 'UPI' && styles.paymentTextActive]}>
            UPI
          </Text>
        </TouchableOpacity>
      </View>

      {/* Dishes List */}
      <FlatList
        data={filteredDishes}
        keyExtractor={(item) => item.dish_id.toString()}
        renderItem={renderDishItem}
        contentContainerStyle={styles.dishList}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Icon name="restaurant" size={48} color="#CCC" />
            <Text style={styles.emptyText}>No dishes found</Text>
          </View>
        }
      />

      {/* Cart Footer */}
      {Object.keys(cart).length > 0 && (
        <View style={styles.cartFooter}>
          <View style={styles.cartInfo}>
            <Text style={styles.cartItemsCount}>
              {getCartItemsCount()} item{getCartItemsCount() !== 1 ? 's' : ''}
            </Text>
            <Text style={styles.cartTotal}>₹{getCartTotal().toFixed(2)}</Text>
          </View>
          
          <TouchableOpacity 
            style={styles.createOrderButton}
            onPress={handleCreateOrder}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <>
                <Icon name="checkmark-circle" size={24} color="#FFF" />
                <Text style={styles.createOrderText}>Create Order</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* Custom Alert */}
      <CustomAlert
        visible={alertConfig.visible}
        title={alertConfig.title}
        message={alertConfig.message}
        type={alertConfig.type}
        onConfirm={alertConfig.onConfirm}
        onCancel={alertConfig.onCancel}
      />
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
    fontFamily: fonts.regular,
  },
  header: {
    backgroundColor: '#235EAA',
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontFamily: fonts.bold,
    color: '#FFF',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#D7E6F7',
    marginTop: 4,
    fontFamily: fonts.regular,
  },
  logoutButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    padding: 10,
    borderRadius: 8,
    marginLeft: 12,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    margin: 16,
    marginBottom: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    elevation: 2,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 48,
    fontSize: 16,
    color: '#333',
    fontFamily: fonts.regular,
  },
  categoryList: {
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  categoryList: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    maxHeight: 50,
  },
  categoryChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    backgroundColor: '#F5F5F5',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  categoryChipActive: {
    backgroundColor: '#235EAA',
    borderColor: '#235EAA',
  },
  categoryText: {
    fontSize: 13,
    color: '#666',
    fontFamily: fonts.semibold,
  },
  categoryTextActive: {
    color: '#FFF',
  },
  paymentSelector: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 8,
    gap: 8,
  },
  paymentButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    backgroundColor: '#FFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    gap: 8,
  },
  paymentButtonActive: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  paymentText: {
    fontSize: 14,
    color: '#666',
    fontFamily: fonts.semibold,
  },
  paymentTextActive: {
    color: '#FFF',
  },
  dishList: {
    padding: 16,
    paddingBottom: 100,
  },
  dishItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFF',
    padding: 16,
    marginBottom: 8,
    borderRadius: 8,
    elevation: 1,
  },
  dishInfo: {
    flex: 1,
  },
  dishName: {
    fontSize: 16,
    fontFamily: fonts.semibold,
    color: '#333',
    marginBottom: 4,
  },
  dishPrice: {
    fontSize: 16,
    fontFamily: fonts.bold,
    color: '#235EAA',
    marginBottom: 2,
  },
  dishCategory: {
    fontSize: 12,
    color: '#999',
    fontFamily: fonts.regular,
  },
  quantityControl: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  quantityButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#235EAA',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
  },
  quantityText: {
    fontSize: 18,
    fontFamily: fonts.bold,
    color: '#333',
    minWidth: 24,
    textAlign: 'center',
  },
  addButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    backgroundColor: '#235EAA',
    borderRadius: 6,
  },
  addButtonText: {
    color: '#FFF',
    fontFamily: fonts.bold,
    fontSize: 14,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 16,
    color: '#999',
    fontFamily: fonts.regular,
  },
  cartFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFF',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    elevation: 8,
  },
  cartInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cartItemsCount: {
    fontSize: 14,
    color: '#666',
    fontFamily: fonts.regular,
  },
  cartTotal: {
    fontSize: 24,
    fontFamily: fonts.bold,
    color: '#333',
  },
  createOrderButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4CAF50',
    padding: 16,
    borderRadius: 8,
    gap: 8,
  },
  createOrderText: {
    color: '#FFF',
    fontSize: 18,
    fontFamily: fonts.bold,
  },
});

export default StaffOrderScreen;

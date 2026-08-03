import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { menuAPI } from '../../services';
import CustomAlert from '../../components/CustomAlert';

const { width } = Dimensions.get('window');

const STORAGE_KEY = '@staff_selected_dishes';

const DishSelectionScreen = () => {
  const [dishes, setDishes] = useState([]);
  const [selectedDishes, setSelectedDishes] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [alertConfig, setAlertConfig] = useState({
    visible: false,
    title: '',
    message: '',
    type: 'info',
    onConfirm: null,
  });

  const showAlert = (title, message, type = 'info') => {
    setAlertConfig({
      visible: true,
      title,
      message,
      type,
      onConfirm: () => setAlertConfig(prev => ({ ...prev, visible: false })),
    });
  };

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load dishes
      const response = await menuAPI.getAllDishes();
      if (response.success && response.data) {
        setDishes(response.data);
      }

      // Load saved selections
      const savedSelections = await AsyncStorage.getItem(STORAGE_KEY);
      if (savedSelections) {
        const selections = JSON.parse(savedSelections);
        setSelectedDishes(new Set(selections));
      } else {
        // By default, select all dishes
        const allDishIds = response.data.map(d => d.dish_id);
        setSelectedDishes(new Set(allDishIds));
      }
    } catch (error) {
      console.error('Error loading data:', error);
      showAlert('Error', 'Failed to load dishes', 'error');
    } finally {
      setLoading(false);
    }
  };

  const toggleDishSelection = (dishId) => {
    const newSelected = new Set(selectedDishes);
    if (newSelected.has(dishId)) {
      newSelected.delete(dishId);
    } else {
      newSelected.add(dishId);
    }
    setSelectedDishes(newSelected);
  };

  const saveSelections = async () => {
    try {
      setSaving(true);
      const selectionsArray = Array.from(selectedDishes);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(selectionsArray));
      showAlert('Success', 'Dish selections saved successfully!', 'success');
    } catch (error) {
      console.error('Error saving selections:', error);
      showAlert('Error', 'Failed to save selections', 'error');
    } finally {
      setSaving(false);
    }
  };

  const selectAll = () => {
    const allDishIds = dishes.map(d => d.dish_id);
    setSelectedDishes(new Set(allDishIds));
  };

  const deselectAll = () => {
    setSelectedDishes(new Set());
  };

  const renderDishItem = ({ item }) => {
    const isSelected = selectedDishes.has(item.dish_id);
    
    return (
      <TouchableOpacity
        style={[styles.dishItem, isSelected && styles.dishItemSelected]}
        onPress={() => toggleDishSelection(item.dish_id)}
      >
        <View style={styles.dishInfo}>
          <Text style={[styles.dishName, isSelected && styles.dishNameSelected]}>
            {item.name}
          </Text>
          <View style={styles.dishMeta}>
            <Text style={styles.dishCategory}>
              {item.category?.dish_category_name || 'N/A'}
            </Text>
            <Text style={styles.dishPrice}>₹{item.price}</Text>
          </View>
        </View>
        
        <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
          {isSelected && (
            <Icon name="checkmark" size={20} color="#fff" />
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderHeader = () => (
    <View style={styles.headerContent}>
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{dishes.length}</Text>
          <Text style={styles.statLabel}>Total Dishes</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statNumber, styles.selectedNumber]}>
            {selectedDishes.size}
          </Text>
          <Text style={styles.statLabel}>Selected</Text>
        </View>
      </View>

      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={[styles.actionButton, styles.selectAllButton]}
          onPress={selectAll}
        >
          <Icon name="checkmark-done" size={18} color="#4CAF50" />
          <Text style={styles.selectAllText}>Select All</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.deselectButton]}
          onPress={deselectAll}
        >
          <Icon name="close" size={18} color="#f44336" />
          <Text style={styles.deselectText}>Deselect All</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.instructionText}>
        Select dishes to show in the ordering screen. Only selected dishes will be available for creating orders.
      </Text>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Dish Selection</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#235EAA" />
          <Text style={styles.loadingText}>Loading dishes...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Dish Selection</Text>
      </View>

      <FlatList
        data={dishes}
        renderItem={renderDishItem}
        keyExtractor={(item) => item.dish_id.toString()}
        ListHeaderComponent={renderHeader}
        contentContainerStyle={styles.listContent}
      />

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={saveSelections}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Icon name="save" size={20} color="#fff" />
              <Text style={styles.saveButtonText}>Save Selections</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Custom Alert */}
      <CustomAlert
        visible={alertConfig.visible}
        title={alertConfig.title}
        message={alertConfig.message}
        type={alertConfig.type}
        onConfirm={alertConfig.onConfirm}
      />
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
    paddingBottom: 100,
  },
  headerContent: {
    backgroundColor: '#fff',
    padding: 16,
    marginBottom: 12,
  },
  statsRow: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  selectedNumber: {
    color: '#235EAA',
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  selectAllButton: {
    backgroundColor: '#E8F5E9',
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  deselectButton: {
    backgroundColor: '#FFEBEE',
    borderWidth: 1,
    borderColor: '#f44336',
  },
  selectAllText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4CAF50',
  },
  deselectText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#f44336',
  },
  instructionText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    textAlign: 'center',
  },
  dishItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginVertical: 6,
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e0e0e0',
  },
  dishItemSelected: {
    borderColor: '#235EAA',
    backgroundColor: '#FFF5F2',
  },
  dishInfo: {
    flex: 1,
  },
  dishName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 6,
  },
  dishNameSelected: {
    color: '#235EAA',
  },
  dishMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dishCategory: {
    fontSize: 13,
    color: '#666',
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  dishPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4CAF50',
  },
  checkbox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#ccc',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  checkboxSelected: {
    backgroundColor: '#235EAA',
    borderColor: '#235EAA',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  saveButton: {
    backgroundColor: '#235EAA',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default DishSelectionScreen;

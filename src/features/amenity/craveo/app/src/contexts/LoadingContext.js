import React, { createContext, useContext, useState } from 'react';
import { Modal, View, StyleSheet } from 'react-native';
import { 
  EnhancedAppLoader, 
  EnhancedProfileLoader, 
  EnhancedOrdersLoader, 
  EnhancedMenuLoader, 
  EnhancedCartLoader 
} from '../components/EnhancedLoaders';
import { colors } from '../constants/theme';

const LoadingContext = createContext();

export const useLoading = () => {
  const context = useContext(LoadingContext);
  if (!context) {
    throw new Error('useLoading must be used within a LoadingProvider');
  }
  return context;
};

export const LoadingProvider = ({ children }) => {
  const [loading, setLoading] = useState({
    visible: false,
    type: 'app', // 'app', 'profile', 'orders', 'menu', 'cart'
    text: '',
    subText: '',
    overlay: true, // whether to show as modal overlay
  });

  const showLoading = (options = {}) => {
    setLoading({
      visible: true,
      type: options.type || 'app',
      text: options.text || '',
      subText: options.subText || '',
      overlay: options.overlay !== false,
    });
  };

  const hideLoading = () => {
    setLoading(prev => ({ ...prev, visible: false }));
  };

  const showAppLoading = (text = 'Loading...', subText = '') => {
    showLoading({ 
      type: 'app', 
      text, 
      subText, 
      overlay: true 
    });
  };

  const showProfileLoading = (text = 'Loading your profile...') => {
    showLoading({ 
      type: 'profile', 
      text, 
      overlay: true 
    });
  };

  const showOrdersLoading = (text = 'Loading your orders...') => {
    showLoading({ 
      type: 'orders', 
      text, 
      overlay: true 
    });
  };

  const showMenuLoading = (text = 'Loading delicious menu...') => {
    showLoading({ 
      type: 'menu', 
      text, 
      overlay: true 
    });
  };

  const showCartLoading = (text = 'Adding to cart...') => {
    showLoading({ 
      type: 'cart', 
      text, 
      overlay: true 
    });
  };

  const renderLoader = () => {
    const { type, text, subText } = loading;
    
    switch (type) {
      case 'profile':
        return <EnhancedProfileLoader text={text} size="large" />;
      case 'orders':
        return <EnhancedOrdersLoader text={text} size="large" />;
      case 'menu':
        return <EnhancedMenuLoader text={text} size="large" />;
      case 'cart':
        return <EnhancedCartLoader text={text} size="large" />;
      case 'app':
      default:
        return <EnhancedAppLoader text={text} subText={subText} />;
    }
  };

  const contextValue = {
    loading: loading.visible,
    showLoading,
    hideLoading,
    showAppLoading,
    showProfileLoading,
    showOrdersLoading,
    showMenuLoading,
    showCartLoading,
  };

  return (
    <LoadingContext.Provider value={contextValue}>
      {children}
      {loading.visible && loading.overlay && (
        <Modal
          transparent
          visible={loading.visible}
          animationType="fade"
          statusBarTranslucent
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalBackground} />
            <View style={styles.loaderContainer}>
              {renderLoader()}
            </View>
          </View>
        </Modal>
      )}
    </LoadingContext.Provider>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
});
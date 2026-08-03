import React from 'react';
import { View } from 'react-native';
import FoodLoader from './FoodLoader';
import { ChefLoader, PizzaOvenLoader } from './AdvancedFoodLoaders';
import { ProfileLoader, OrdersLoader } from './SpecializedLoaders';

// Main food-themed activity indicator replacement
const FoodActivityIndicator = ({ 
  size = 'large', 
  color = '#235EAA', // Can be ignored as we use theme colors
  style = {},
  type = 'cooking', // 'cooking', 'pizza', 'burger', 'coffee', 'chef', 'oven', 'profile', 'orders'
  text,
  animating = true
}) => {
  if (!animating) {
    return null;
  }

  // Auto-generate context-aware loading text based on type
  const getLoadingText = () => {
    if (text) return text;
    
    switch (type) {
      case 'cooking':
        return 'Preparing your delicious meal...';
      case 'pizza':
        return 'Tossing fresh pizza dough...';
      case 'burger':
        return 'Grilling your burger...';
      case 'coffee':
        return 'Brewing fresh coffee...';
      case 'chef':
        return 'Chef is cooking your order...';
      case 'oven':
        return 'Baking in wood-fired oven...';
      case 'profile':
        return 'Setting up your profile...';
      case 'orders':
        return 'Loading your order history...';
      default:
        return 'Preparing your order...';
    }
  };

  const renderLoader = () => {
    switch (type) {
      case 'chef':
        return (
          <ChefLoader 
            size={size}
            text={getLoadingText()}
            style={style}
          />
        );
      case 'oven':
        return (
          <PizzaOvenLoader 
            size={size}
            text={getLoadingText()}
            style={style}
          />
        );
      case 'profile':
        return (
          <ProfileLoader 
            size={size}
            text={getLoadingText()}
            style={style}
          />
        );
      case 'orders':
        return (
          <OrdersLoader 
            size={size}
            text={getLoadingText()}
            style={style}
          />
        );
      default:
        return (
          <FoodLoader 
            size={size}
            text={getLoadingText()}
            style={style}
            type={type}
          />
        );
    }
  };

  return (
    <View style={style}>
      {renderLoader()}
    </View>
  );
};

// Import enhanced loader
import { EnhancedMenuLoader } from './EnhancedLoaders';

// Quick replacement components for common use cases
const MenuLoader = ({ size = 'large', style = {}, text = "Loading delicious dishes..." }) => (
  <EnhancedMenuLoader 
    size={size} 
    style={style}
    text={text}
  />
);

const OrderLoader = ({ size = 'medium', style = {} }) => (
  <FoodActivityIndicator 
    type="orders" 
    size={size} 
    style={style}
    text="Loading your orders..."
  />
);

const CartLoader = ({ size = 'medium', style = {} }) => (
  <FoodActivityIndicator 
    type="burger" 
    size={size} 
    style={style}
    text="Preparing your cart..."
  />
);

const PaymentLoader = ({ size = 'large', style = {} }) => (
  <FoodActivityIndicator 
    type="oven" 
    size={size} 
    style={style}
    text="Processing payment..."
  />
);

const ProfileLoadingComponent = ({ size = 'large', style = {} }) => (
  <FoodActivityIndicator 
    type="profile" 
    size={size} 
    style={style}
    text="Loading your profile..."
  />
);

export default FoodActivityIndicator;
export { MenuLoader, OrderLoader, CartLoader, PaymentLoader, ProfileLoadingComponent, ProfileLoader, OrdersLoader };

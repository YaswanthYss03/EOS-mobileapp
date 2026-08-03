import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Badge, Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import { colors } from '../constants/theme';

// Craveo's own bottom bar, shown only while inside the Craveo module (EOS's own
// tab bar is hidden for these screens - see app/(tabs)/_layout.tsx). Deliberately
// styled differently from both EOS's tab bar and the old BottomNavigation.js:
// white bar, blue active state and floating scan button (colors.primary,
// derived from assets/logo.png) - see constants/theme.js.
const CraveoBottomNav = ({ navigation, currentRoute }) => {
  const { items } = useSelector((state) => state.cart);
  const totalCartItems = Array.isArray(items)
    ? items.reduce((sum, item) => sum + (Number(item?.quantity) || 0), 0)
    : 0;

  const navItems = [
    { name: 'Menu', icon: 'home-outline', activeIcon: 'home', route: 'Menu', label: 'Home' },
    { name: 'Orders', icon: 'receipt-text-outline', activeIcon: 'receipt-text', route: 'Orders', label: 'Orders' },
    { name: 'QRScanner', icon: 'qrcode-scan', route: 'QRScanner', label: 'Scan', isFloating: true },
    { name: 'Cart', icon: 'cart-outline', activeIcon: 'cart', route: 'Cart', label: 'Cart', badge: totalCartItems },
    { name: 'Profile', icon: 'account-outline', activeIcon: 'account', route: 'Profile', label: 'Profile' },
  ];

  const handleNavPress = (route) => {
    if (currentRoute !== route) {
      navigation.navigate(route);
    }
  };

  return (
    <View style={styles.bar}>
      {navItems.map((item) => {
        const active = currentRoute === item.route;

        if (item.isFloating) {
          return (
            <TouchableOpacity
              key={item.name}
              style={styles.floatingButton}
              onPress={() => handleNavPress(item.route)}
              activeOpacity={0.85}
            >
              <MaterialCommunityIcons name={item.icon} size={26} color="#fff" />
            </TouchableOpacity>
          );
        }

        return (
          <TouchableOpacity
            key={item.name}
            style={styles.navButton}
            onPress={() => handleNavPress(item.route)}
            activeOpacity={0.7}
          >
            <View style={styles.iconWrap}>
              <MaterialCommunityIcons
                name={active ? item.activeIcon : item.icon}
                size={22}
                color={active ? colors.primary : '#9A9A9A'}
              />
              {item.badge !== undefined && item.badge > 0 && (
                <Badge style={styles.cartBadge} size={15}>
                  {Number(item.badge) > 99 ? '99+' : String(Number(item.badge) || 0)}
                </Badge>
              )}
            </View>
            <Text style={[styles.label, active && styles.labelActive]}>{item.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 10,
    paddingBottom: 10,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  navButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrap: {
    position: 'relative',
  },
  label: {
    fontSize: 10,
    color: '#9A9A9A',
    marginTop: 2,
    fontWeight: '500',
  },
  labelActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  cartBadge: {
    position: 'absolute',
    top: -6,
    right: -10,
    backgroundColor: colors.primary,
    color: '#fff',
    fontSize: 9,
    fontWeight: 'bold',
  },
  floatingButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -28,
    borderWidth: 4,
    borderColor: '#fff',
    elevation: 6,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
  },
});

export default CraveoBottomNav;

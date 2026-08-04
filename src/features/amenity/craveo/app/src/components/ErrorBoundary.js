import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { fonts } from '../../../../../../theme';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('🚨 App Error:', error);
    console.error('🚨 Error Info:', errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Something went wrong!</Text>
          <Text style={styles.errorText}>
            {this.state.error?.toString() || 'Unknown error occurred'}
          </Text>
          <Text style={styles.errorHelp}>
            Check the console for more details.
          </Text>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  errorTitle: {
    fontSize: 24,
    fontFamily: fonts.bold,
    color: '#d32f2f',
    marginBottom: 10,
  },
  errorText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
    fontFamily: fonts.regular,
  },
  errorHelp: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    fontFamily: fonts.regular,
  },
});

export default ErrorBoundary;

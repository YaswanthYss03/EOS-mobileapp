import React, { useState, useEffect } from 'react';
import { DeviceEventEmitter } from 'react-native';
import AlarmModal from './AlarmModal';

const AlarmModalProvider = ({ children }) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [alarmData, setAlarmData] = useState(null);
  const [handlers, setHandlers] = useState({});

  useEffect(() => {
    // Listen for show modal events
    const showSubscription = DeviceEventEmitter.addListener('showAlarmModal', (data) => {
      console.log('📱 Showing custom alarm modal');
      setAlarmData(data.alarmData);
      setHandlers({
        onAcknowledge: data.onAcknowledge,
        onSnooze: data.onSnooze,
        onDismiss: data.onDismiss,
      });
      setModalVisible(true);
    });

    // Listen for hide modal events
    const hideSubscription = DeviceEventEmitter.addListener('hideAlarmModal', () => {
      console.log('📱 Hiding custom alarm modal');
      setModalVisible(false);
      setAlarmData(null);
      setHandlers({});
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  const handleAcknowledge = () => {
    if (handlers.onAcknowledge) {
      handlers.onAcknowledge();
    }
  };

  const handleSnooze = () => {
    if (handlers.onSnooze) {
      handlers.onSnooze();
    }
  };

  const handleDismiss = () => {
    if (handlers.onDismiss) {
      handlers.onDismiss();
    }
  };

  return (
    <>
      {children}
      <AlarmModal
        visible={modalVisible}
        alarmData={alarmData}
        onAcknowledge={handleAcknowledge}
        onSnooze={handleSnooze}
        onDismiss={handleDismiss}
      />
    </>
  );
};

export default AlarmModalProvider;

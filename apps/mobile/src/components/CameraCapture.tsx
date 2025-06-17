import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { Button, colors, spacing, typography } from '@invoicepe/ui-kit';
import { PermissionGate } from './permissions/PermissionGate';
import { PermissionType, PERMISSION_CONTEXTS } from '../types/permissions';
import { AnimatedButton } from './animations/AnimatedButton';
import { FadeInView } from './animations/FadeInView';

interface CameraCaptureProps {
  onImageCaptured: (uri: string) => void;
  onClose: () => void;
}

export const CameraCapture: React.FC<CameraCaptureProps> = ({
  onImageCaptured,
  onClose,
}) => {
  const [facing, setFacing] = useState<CameraType>('back');
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);

  const takePicture = async () => {
    if (cameraRef.current) {
      try {
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.8,
          base64: false,
        });
        
        if (photo?.uri) {
          onImageCaptured(photo.uri);
        }
      } catch (error) {
        Alert.alert('Error', 'Failed to capture photo. Please try again.');
        console.error('Camera capture error:', error);
      }
    }
  };

  const pickFromGallery = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        onImageCaptured(result.assets[0].uri);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick image from gallery.');
      console.error('Gallery picker error:', error);
    }
  };

  const toggleCameraFacing = () => {
    setFacing(current => (current === 'back' ? 'front' : 'back'));
  };

  if (!permission) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Loading camera...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <PermissionGate
        permission={PermissionType.CAMERA}
        context={PERMISSION_CONTEXTS[PermissionType.CAMERA]}
        fallback={
          <View style={styles.container}>
            <FadeInView style={styles.fallbackContainer}>
              <Text style={styles.fallbackTitle}>Camera Not Available</Text>
              <Text style={styles.fallbackText}>
                You can still add invoice photos from your gallery
              </Text>
              <Button
                title="Choose from Gallery"
                onPress={pickFromGallery}
                style={styles.galleryButton}
              />
              <Button
                title="Cancel"
                variant="ghost"
                onPress={onClose}
                style={styles.cancelButton}
              />
            </FadeInView>
          </View>
        }
      >
        <View style={styles.container}>
          <CameraView
            ref={cameraRef}
            style={styles.camera}
            facing={facing}
          >
            <FadeInView style={styles.overlay}>
              {/* Header */}
              <View style={styles.header}>
                <AnimatedButton onPress={onClose} style={styles.closeButton}>
                  <Text style={styles.closeButtonText}>✕</Text>
                </AnimatedButton>
                <Text style={styles.headerTitle}>Capture Invoice</Text>
                <AnimatedButton onPress={toggleCameraFacing} style={styles.flipButton}>
                  <Text style={styles.flipButtonText}>🔄</Text>
                </AnimatedButton>
              </View>

              {/* Capture guide */}
              <View style={styles.guideContainer}>
                <View style={styles.guide} />
                <Text style={styles.guideText}>
                  Position invoice within the frame
                </Text>
              </View>

              {/* Controls */}
              <View style={styles.controls}>
                <AnimatedButton onPress={pickFromGallery} style={styles.galleryBtn}>
                  <Text style={styles.controlButtonText}>📁</Text>
                </AnimatedButton>
                
                <AnimatedButton onPress={takePicture} style={styles.captureButton}>
                  <View style={styles.captureButtonInner} />
                </AnimatedButton>
                
                <View style={styles.placeholder} />
              </View>
            </FadeInView>
          </CameraView>
        </View>
      </PermissionGate>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        ref={cameraRef}
        style={styles.camera}
        facing={facing}
      >
        <FadeInView style={styles.overlay}>
          {/* Header */}
          <View style={styles.header}>
            <AnimatedButton onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>✕</Text>
            </AnimatedButton>
            <Text style={styles.headerTitle}>Capture Invoice</Text>
            <AnimatedButton onPress={toggleCameraFacing} style={styles.flipButton}>
              <Text style={styles.flipButtonText}>🔄</Text>
            </AnimatedButton>
          </View>

          {/* Capture guide */}
          <View style={styles.guideContainer}>
            <View style={styles.guide} />
            <Text style={styles.guideText}>
              Position invoice within the frame
            </Text>
          </View>

          {/* Controls */}
          <View style={styles.controls}>
            <AnimatedButton onPress={pickFromGallery} style={styles.galleryBtn}>
              <Text style={styles.controlButtonText}>📁</Text>
            </AnimatedButton>
            
            <AnimatedButton onPress={takePicture} style={styles.captureButton}>
              <View style={styles.captureButtonInner} />
            </AnimatedButton>
            
            <View style={styles.placeholder} />
          </View>
        </FadeInView>
      </CameraView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 50,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    color: colors.white,
    fontSize: 18,
    fontWeight: 'bold',
  },
  headerTitle: {
    ...typography.h3,
    color: colors.white,
    textAlign: 'center',
  },
  flipButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  flipButtonText: {
    fontSize: 18,
  },
  guideContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  guide: {
    width: '90%',
    height: 200,
    borderWidth: 2,
    borderColor: colors.primary[500],
    borderRadius: 12,
    backgroundColor: 'transparent',
  },
  guideText: {
    ...typography.body,
    color: colors.white,
    textAlign: 'center',
    marginTop: spacing.md,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 8,
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingBottom: 50,
  },
  galleryBtn: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  controlButtonText: {
    fontSize: 24,
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: colors.white,
  },
  captureButtonInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.white,
  },
  placeholder: {
    width: 50,
    height: 50,
  },
  loadingText: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 100,
  },
  fallbackContainer: {
    alignItems: 'center',
    padding: spacing.xl,
  },
  fallbackTitle: {
    ...typography.h2,
    color: colors.text,
    marginBottom: spacing.md,
  },
  fallbackText: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  galleryButton: {
    marginBottom: spacing.md,
    minWidth: 200,
  },
  cancelButton: {
    minWidth: 200,
  },
});

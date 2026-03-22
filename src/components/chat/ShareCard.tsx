import React, { useRef } from 'react';
import {
  View, Text, StyleSheet, Modal, TouchableOpacity, Share, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';

let ViewShot: any = null;
let Sharing: any = null;
try { ViewShot = require('react-native-view-shot').default; } catch {}
try { Sharing = require('expo-sharing'); } catch {}

export interface ShareCardData {
  characterName: string;
  characterEmoji: string;
  characterColor: string;
  messageText: string;   // The AI message to share
  userName: string;
  appName?: string;
}

interface Props {
  visible: boolean;
  data: ShareCardData;
  onClose: () => void;
}

export function ShareCard({ visible, data, onClose }: Props) {
  const cardRef = useRef<any>(null);

  const handleShare = async () => {
    if (ViewShot && Sharing && cardRef.current) {
      try {
        const uri = await cardRef.current.capture();
        const canShare = await Sharing.isAvailableAsync();
        if (canShare) {
          await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'Share this chat' });
          onClose();
          return;
        }
      } catch {}
    }
    // Fallback: share as text
    await Share.share({
      message: `"${data.messageText}"\n\n— ${data.characterName} on ${data.appName || 'Daze'} 💜\nDownload the app!`,
    });
    onClose();
  };

  const CardContent = (
    <View style={styles.card}>
      <LinearGradient
        colors={[data.characterColor + 'DD', '#000000']}
        style={StyleSheet.absoluteFillObject}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
      />
      {/* App tag */}
      <View style={styles.appTag}>
        <LinearGradient colors={['#A855F7', '#EC4899']} style={StyleSheet.absoluteFillObject} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} />
        <Text style={styles.appTagText}>{data.appName || 'Daze'} ✨</Text>
      </View>

      {/* Character avatar */}
      <View style={[styles.avatarCircle, { borderColor: data.characterColor }]}>
        <Text style={styles.avatarEmoji}>{data.characterEmoji}</Text>
      </View>
      <Text style={styles.charName}>{data.characterName}</Text>

      {/* Message */}
      <View style={styles.msgBubble}>
        <Text style={styles.quoteSymbol}>"</Text>
        <Text style={styles.msgText}>{data.messageText}</Text>
      </View>

      {/* Footer */}
      <Text style={styles.footer}>
        Chatted by {data.userName} • {data.appName || 'Daze'} app
      </Text>
    </View>
  );

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <Text style={styles.title}>Share this message ✨</Text>

          {/* Preview card */}
          {ViewShot ? (
            <ViewShot ref={cardRef} options={{ format: 'png', quality: 0.95 }}>
              {CardContent}
            </ViewShot>
          ) : CardContent}

          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity style={styles.shareBtn} onPress={handleShare}>
              <LinearGradient colors={['#A855F7', '#EC4899']} style={StyleSheet.absoluteFillObject} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} />
              <Ionicons name="share-social" size={18} color="#fff" />
              <Text style={styles.shareBtnText}>Share</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', alignItems: 'center', justifyContent: 'center', padding: 20 },
  container: { width: '100%', maxWidth: 380, gap: 16 },
  title: { color: '#fff', fontSize: 18, fontWeight: '800', textAlign: 'center' },
  card: {
    borderRadius: 24, padding: 24, alignItems: 'center', gap: 12,
    overflow: 'hidden', borderWidth: 1, borderColor: '#ffffff22',
    minHeight: 280,
  },
  appTag: {
    borderRadius: 12, paddingHorizontal: 12, paddingVertical: 5, overflow: 'hidden',
    alignSelf: 'flex-end',
  },
  appTagText: { color: '#fff', fontSize: 12, fontWeight: '800' },
  avatarCircle: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: '#111', alignItems: 'center', justifyContent: 'center',
    borderWidth: 2,
  },
  avatarEmoji: { fontSize: 38 },
  charName: { color: '#fff', fontSize: 18, fontWeight: '800' },
  msgBubble: { backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 16, padding: 16, width: '100%' },
  quoteSymbol: { fontSize: 36, color: 'rgba(255,255,255,0.3)', lineHeight: 28, marginBottom: 4 },
  msgText: { color: '#fff', fontSize: 15, lineHeight: 22, fontWeight: '500' },
  footer: { color: 'rgba(255,255,255,0.4)', fontSize: 11, marginTop: 4 },
  actions: { flexDirection: 'row', gap: 10 },
  shareBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, borderRadius: 16, paddingVertical: 14, overflow: 'hidden',
  },
  shareBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  cancelBtn: {
    flex: 1, borderRadius: 16, paddingVertical: 14,
    alignItems: 'center', backgroundColor: '#1a1a1a',
  },
  cancelText: { color: colors.textMuted, fontWeight: '700', fontSize: 15 },
});

import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { characters } from '../../data/characters';
import { scenarios } from '../../data/scenarios';
import { useChatStore } from '../../store/useChatStore';
import { Avatar } from '../../components/common/Avatar';
import { GradientButton } from '../../components/common/GradientButton';
import { Chat, GroupScenario } from '../../types';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, borderRadius } from '../../theme/spacing';

export default function CreateGroupScreen() {
  const router = useRouter();
  const createChat = useChatStore((s) => s.createChat);
  const [selected, setSelected] = useState<string[]>([]);
  const [groupName, setGroupName] = useState('');
  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace('/(tabs)');
  };

  const toggleCharacter = (id: string) => {
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 3) return prev;
      return [...prev, id];
    });
  };

  const handleCreate = () => {
    if (selected.length < 2) return;
    const title = groupName.trim() || selected.map((id) => {
      const c = characters.find((ch) => ch.id === id);
      return c?.name || id;
    }).join(', ');

    const chat: Chat = {
      id: `group_custom_${Date.now()}`,
      type: 'group',
      characterIds: selected,
      title,
      mutedCharacters: [],
    };
    createChat(chat);
    router.replace(`/group/${chat.id}`);
  };

  const handleScenario = (scenario: GroupScenario) => {
    const chat: Chat = {
      id: `group_${scenario.id}_${Date.now()}`,
      type: 'group',
      characterIds: scenario.characterIds,
      title: scenario.name,
      scenarioId: scenario.id,
      mutedCharacters: [],
    };
    createChat(chat);
    router.replace(`/group/${chat.id}`);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>Create Group</Text>
      </View>

      <FlatList
        ListHeaderComponent={
          <>
            {/* Quick scenarios */}
            <Text style={styles.sectionTitle}>Quick Start Scenes</Text>
            <View style={styles.scenarioGrid}>
              {scenarios.slice(0, 4).map((s) => (
                <TouchableOpacity
                  key={s.id}
                  style={styles.scenarioCard}
                  onPress={() => handleScenario(s)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.scenarioEmoji}>{s.emoji}</Text>
                  <Text style={styles.scenarioName}>{s.name}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Custom group */}
            <Text style={[styles.sectionTitle, { marginTop: spacing.xxl }]}>
              Or build your own
            </Text>

            <TextInput
              style={styles.nameInput}
              placeholder="Group name (optional)"
              placeholderTextColor={colors.textMuted}
              value={groupName}
              onChangeText={setGroupName}
              maxLength={30}
            />

            <Text style={styles.selectLabel}>
              Select 2-3 characters ({selected.length}/3)
            </Text>
          </>
        }
        data={characters}
        numColumns={2}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.grid}
        columnWrapperStyle={styles.row}
        renderItem={({ item }) => {
          const isSelected = selected.includes(item.id);
          return (
            <TouchableOpacity
              style={[styles.charCard, isSelected && styles.charSelected]}
              onPress={() => toggleCharacter(item.id)}
              activeOpacity={0.7}
            >
              <Avatar color={item.avatarColor} emoji={item.avatarEmoji} image={item.avatarImage} size={40} />
              <Text style={styles.charName}>{item.name}</Text>
              <Text style={styles.charType}>{item.archetype}</Text>
            </TouchableOpacity>
          );
        }}
        ListFooterComponent={<View style={{ height: 100 }} />}
      />

      <View style={styles.footer}>
        <GradientButton
          title="Create Group"
          onPress={handleCreate}
          disabled={selected.length < 2}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: {
    padding: spacing.xs,
  },
  title: {
    ...typography.h3,
    color: colors.textPrimary,
    marginLeft: spacing.sm,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    paddingHorizontal: spacing.xxl,
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },
  scenarioGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  scenarioCard: {
    backgroundColor: colors.bgCard,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    width: '47%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  scenarioEmoji: {
    fontSize: 24,
    marginBottom: spacing.xs,
  },
  scenarioName: {
    ...typography.caption,
    color: colors.textPrimary,
    fontWeight: '600',
    textAlign: 'center',
  },
  nameInput: {
    ...typography.body,
    color: colors.textPrimary,
    backgroundColor: colors.bgInput,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    marginHorizontal: spacing.xxl,
    borderWidth: 1,
    borderColor: colors.border,
  },
  selectLabel: {
    ...typography.caption,
    color: colors.textMuted,
    paddingHorizontal: spacing.xxl,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  grid: {
    paddingHorizontal: spacing.lg,
  },
  row: {
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  charCard: {
    backgroundColor: colors.bgCard,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    width: '48%',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  charSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '10',
  },
  charName: {
    ...typography.bodyBold,
    color: colors.textPrimary,
    fontSize: 13,
    marginTop: spacing.xs,
  },
  charType: {
    ...typography.small,
    color: colors.textMuted,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: spacing.xxl,
    paddingBottom: spacing.xxxl,
    paddingTop: spacing.lg,
    backgroundColor: colors.bg + 'F0',
  },
});

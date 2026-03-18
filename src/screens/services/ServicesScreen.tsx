import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  SafeAreaView,
  Animated,
} from 'react-native';
import { CheckCircle } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

import { ServiceItem as ServiceItemType, ServiceCategory } from '@/types';
import { useTheme } from '@/hooks/useTheme';
import { COLORS } from '@/constants/colors';
import SearchBar from '@/components/SearchBar';
import FilterChips from '@/components/FilterChips';
import ServiceItem from '@/components/ServiceItem';
import Modal from '@/components/Modal';

const SERVICES: ServiceItemType[] = [
  { id: 's1', name: 'Hospital Registration', provider: 'Charité Berlin', category: ServiceCategory.HEALTH, description: 'Register as a patient', requiredCredentials: ['Health Insurance', 'National ID'], iconColor: '#EF4444' },
  { id: 's2', name: 'Online Banking', provider: 'Deutsche Bank', category: ServiceCategory.FINANCIAL, description: 'Access banking services', requiredCredentials: ['National ID', 'Bank Account'], iconColor: '#3B82F6' },
  { id: 's3', name: 'Public Transport Pass', provider: 'BVG Berlin', category: ServiceCategory.TRANSPORT, description: 'Apply for monthly pass', requiredCredentials: ['National ID'], iconColor: '#8B5CF6' },
  { id: 's4', name: 'Visa Application', provider: 'German Embassy', category: ServiceCategory.GOVERNMENT, description: 'Apply for travel visa', requiredCredentials: ['Passport', 'National ID'], iconColor: '#003399' },
  { id: 's5', name: 'University Enrollment', provider: 'TU Berlin', category: ServiceCategory.EDUCATION, description: 'Enroll in courses', requiredCredentials: ['University Degree', 'National ID'], iconColor: '#6366F1' },
  { id: 's6', name: 'Electricity Contract', provider: 'Vattenfall', category: ServiceCategory.UTILITIES, description: 'Set up electricity', requiredCredentials: ['National ID', 'Residence Permit'], iconColor: '#F59E0B' },
  { id: 's7', name: 'Prescription Service', provider: 'DocMorris', category: ServiceCategory.HEALTH, description: 'Order prescriptions', requiredCredentials: ['Health Insurance'], iconColor: '#10B981' },
  { id: 's8', name: 'Tax Filing', provider: 'ELSTER Online', category: ServiceCategory.FINANCIAL, description: 'File tax returns', requiredCredentials: ['Tax Certificate', 'National ID'], iconColor: '#0EA5E9' },
  { id: 's9', name: 'Driver License Renewal', provider: 'KBA', category: ServiceCategory.TRANSPORT, description: 'Renew driving license', requiredCredentials: ['Driver\'s License', 'National ID'], iconColor: '#64748B' },
  { id: 's10', name: 'Social Security', provider: 'Deutsche Rentenversicherung', category: ServiceCategory.GOVERNMENT, description: 'Manage pension account', requiredCredentials: ['Social Security', 'National ID'], iconColor: '#F97316' },
  { id: 's11', name: 'Job Application', provider: 'Bundesagentur für Arbeit', category: ServiceCategory.GOVERNMENT, description: 'Apply for jobs', requiredCredentials: ['Employment Certificate', 'National ID'], iconColor: '#EC4899' },
];

const FLOW_STEPS = ['CONNECT', 'AUTH', 'SHARE', 'SUCCESS', 'REDIRECT'] as const;
const FLOW_LABELS: Record<string, string> = {
  CONNECT: 'Establishing connection',
  AUTH: 'Authenticating',
  SHARE: 'Sharing credentials',
  SUCCESS: 'Access granted',
  REDIRECT: 'Redirecting',
};
const FLOW_DURATIONS: Record<string, number> = {
  CONNECT: 1500, AUTH: 2000, SHARE: 2000, SUCCESS: 1500, REDIRECT: 1500,
};

const CATEGORY_FILTERS = ['All', ...Object.values(ServiceCategory)];

export default function ServicesScreen() {
  const { colors } = useTheme();
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [flowModal, setFlowModal] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);

  const filteredServices = useMemo(() => {
    return SERVICES.filter((s) => {
      const matchesSearch =
        !search.trim() ||
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        s.provider.toLowerCase().includes(search.toLowerCase());
      const matchesCategory = selectedCategory === 'All' || s.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [search, selectedCategory]);

  async function runFlow() {
    setCurrentStep(0);
    setCompletedSteps([]);
    setFlowModal(true);
    for (let i = 0; i < FLOW_STEPS.length; i++) {
      setCurrentStep(i);
      await new Promise((r) => setTimeout(r, FLOW_DURATIONS[FLOW_STEPS[i]]));
      setCompletedSteps((prev) => [...prev, i]);
    }
    await new Promise((r) => setTimeout(r, 400));
    setFlowModal(false);
  }

  function handleServicePress(service: ServiceItemType) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    runFlow();
  }

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Services</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Access government &amp; private services
        </Text>
      </View>

      <View style={styles.searchContainer}>
        <SearchBar value={search} onChangeText={setSearch} placeholder="Search services…" />
      </View>

      <FilterChips
        options={CATEGORY_FILTERS}
        selected={selectedCategory}
        onSelect={setSelectedCategory}
      />

      <FlatList
        data={filteredServices}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ServiceItem service={item} onPress={handleServicePress} />
        )}
        contentContainerStyle={styles.listContent}
        style={{ marginTop: 8 }}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No services found</Text>
            <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
              Try adjusting your search or filter
            </Text>
          </View>
        }
      />

      {/* Service flow modal */}
      <Modal visible={flowModal} onClose={() => {}}>
        <View style={styles.flowContent}>
          <Text style={[styles.flowTitle, { color: colors.text }]}>Connecting to Service</Text>
          {FLOW_STEPS.map((step, i) => {
            const isDone = completedSteps.includes(i);
            const isCurrent = currentStep === i && !isDone;
            return (
              <View
                key={step}
                style={[
                  styles.flowStep,
                  { opacity: i > currentStep && !isDone ? 0.4 : 1 },
                ]}
              >
                <View style={[styles.flowIcon, { backgroundColor: isDone ? COLORS.status.active + '20' : colors.input }]}>
                  {isDone ? (
                    <CheckCircle color={COLORS.status.active} size={20} />
                  ) : (
                    <Text style={[styles.flowStepNum, { color: isCurrent ? COLORS.euBlue : colors.textSecondary }]}>
                      {i + 1}
                    </Text>
                  )}
                </View>
                <Text style={[
                  styles.flowLabel,
                  { color: isDone ? COLORS.status.active : isCurrent ? colors.text : colors.textSecondary },
                  isCurrent && { fontWeight: '700' },
                ]}>
                  {FLOW_LABELS[step]}
                </Text>
              </View>
            );
          })}
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 14,
    marginTop: 2,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  listContent: {
    paddingBottom: 32,
  },
  emptyState: {
    paddingTop: 60,
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
  },
  flowContent: {
    padding: 24,
    gap: 18,
  },
  flowTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  flowStep: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  flowIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  flowStepNum: {
    fontSize: 16,
    fontWeight: '700',
  },
  flowLabel: {
    fontSize: 15,
  },
});

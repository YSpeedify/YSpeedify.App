import React, { useEffect, useMemo, useRef, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, Animated, Dimensions, SafeAreaView, ScrollView, ActivityIndicator, Platform, useWindowDimensions } from 'react-native';
import { WebView } from 'react-native-webview';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import Svg, { Path } from 'react-native-svg';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface Tab {
  id: string;
  url: string;
  title: string;
}

type PersistedSessionV1 = {
  version: 1;
  tabs: Tab[];
  activeTabId: string;
};

const SESSION_STORAGE_KEY = 'yspeed.session.v1';
const DEFAULT_TABS: Tab[] = [{ id: '1', url: 'https://google.com', title: 'New Tab' }];

type RemixIconName =
  | 'arrow-left-s-line'
  | 'arrow-right-s-line'
  | 'refresh-line'
  | 'stack-line'
  | 'close-line'
  | 'add-line';

const REMIX_PATHS: Record<RemixIconName, string> = {
  'arrow-left-s-line': 'M11 12l7-7 1.4 1.4L13.8 12l5.6 5.6L18 19l-7-7z',
  'arrow-right-s-line': 'M13 12L6 5l-1.4 1.4L10.2 12l-5.6 5.6L6 19l7-7z',
  'refresh-line': 'M17.65 6.35A7.95 7.95 0 0012 4V1L7 6l5 5V6a6 6 0 11-6 6H4a8 8 0 1013.65-5.65z',
  'stack-line': 'M4 7h16v2H4V7zm2 6h12v2H6v-2zm-2 6h16v2H4v-2z',
  'close-line': 'M18.3 5.71L12 12l6.3 6.29-1.41 1.42L10.59 13.4 4.29 19.71 2.88 18.29 9.17 12 2.88 5.71 4.29 4.29l6.3 6.3 6.29-6.3 1.42 1.42z',
  'add-line': 'M11 11V5h2v6h6v2h-6v6h-2v-6H5v-2h6z',
};

function RemixIcon({ name, size, color }: { name: RemixIconName; size: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d={REMIX_PATHS[name]} fill={color} />
    </Svg>
  );
}

function YSpeedifyApp() {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isLandscape = width > height;
  const isTablet = Math.min(width, height) >= 600;

  const bottomBarHeight = isTablet ? 86 : isLandscape ? 64 : 76;
  const topBarHeight = isTablet ? 92 : isLandscape ? 64 : 78;
  const tabSheetTopOffset = (insets?.top ?? 0) + topBarHeight + 10;
  const tabSheetHeight = Math.min(height * (isLandscape ? 0.5 : 0.32), isTablet ? 340 : 260);
  const tabCardWidth = Math.min(isTablet ? 240 : 190, width * (isLandscape ? 0.34 : 0.52));
  const tabCardHeight = isTablet ? 96 : 86;

  const [tabs, setTabs] = useState<Tab[]>(DEFAULT_TABS);
  const [activeTabId, setActiveTabId] = useState(DEFAULT_TABS[0].id);
  const [url, setUrl] = useState(DEFAULT_TABS[0].url);
  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(false);
  const [showTabs, setShowTabs] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [hydrated, setHydrated] = useState(false);
  const isHydratingRef = useRef(true);
  
  const webViewRef = useRef<WebView>(null);
  const slideAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const activeTab = useMemo(() => tabs.find(tab => tab.id === activeTabId), [tabs, activeTabId]);

  useEffect(() => {
    let cancelled = false;

    const hydrate = async () => {
      try {
        const raw = await AsyncStorage.getItem(SESSION_STORAGE_KEY);
        if (!raw) {
          if (!cancelled) setHydrated(true);
          return;
        }

        const parsed = JSON.parse(raw) as PersistedSessionV1;
        if (parsed?.version !== 1 || !Array.isArray(parsed.tabs) || typeof parsed.activeTabId !== 'string') {
          if (!cancelled) setHydrated(true);
          return;
        }

        const safeTabs = parsed.tabs.filter(t => typeof t?.id === 'string' && typeof t?.url === 'string' && typeof t?.title === 'string');
        if (safeTabs.length === 0) {
          if (!cancelled) setHydrated(true);
          return;
        }

        const safeActiveId = safeTabs.some(t => t.id === parsed.activeTabId) ? parsed.activeTabId : safeTabs[0].id;
        const safeActiveTab = safeTabs.find(t => t.id === safeActiveId) ?? safeTabs[0];

        if (cancelled) return;
        setTabs(safeTabs);
        setActiveTabId(safeActiveId);
        setUrl(safeActiveTab.url);
        setHydrated(true);
        isHydratingRef.current = false;
      } catch {
        if (!cancelled) setHydrated(true);
        isHydratingRef.current = false;
      }
    };

    hydrate();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!hydrated) return;

    const session: PersistedSessionV1 = {
      version: 1,
      tabs,
      activeTabId,
    };

    const timeout = setTimeout(() => {
      AsyncStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session)).catch(() => {});
    }, 350);

    return () => clearTimeout(timeout);
  }, [tabs, activeTabId, hydrated]);

  const handleLoad = () => {
    setIsLoading(false);
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const handleLoadStart = () => {
    setIsLoading(true);
    Animated.timing(fadeAnim, {
      toValue: 0.3,
      duration: 200,
      useNativeDriver: true,
    }).start();
  };

  const handleNavigationStateChange = (navState: any) => {
    if (isHydratingRef.current) return;
    setCanGoBack(navState.canGoBack);
    setCanGoForward(navState.canGoForward);
    setUrl(navState.url);
    
    const updatedTabs = tabs.map(tab => 
      tab.id === activeTabId 
        ? { ...tab, url: navState.url, title: navState.title || 'New Tab' }
        : tab
    );
    setTabs(updatedTabs);
  };

  const goBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (webViewRef.current) {
      webViewRef.current.goBack();
    }
  };

  const goForward = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (webViewRef.current) {
      webViewRef.current.goForward();
    }
  };

  const refresh = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (webViewRef.current) {
      webViewRef.current.reload();
    }
  };

  const handleUrlSubmit = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    let finalUrl = url;
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      finalUrl = `https://${url}`;
    }
    setUrl(finalUrl);
    
    const updatedTabs = tabs.map(tab => 
      tab.id === activeTabId 
        ? { ...tab, url: finalUrl }
        : tab
    );
    setTabs(updatedTabs);
  };

  const toggleTabs = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowTabs(!showTabs);
    Animated.timing(slideAnim, {
      toValue: showTabs ? 0 : 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const addNewTab = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const newTab: Tab = {
      id: Date.now().toString(),
      url: 'https://google.com',
      title: 'New Tab'
    };
    setTabs([...tabs, newTab]);
    setActiveTabId(newTab.id);
    setUrl('https://google.com');
    setShowTabs(false);
  };

  const closeTab = (tabId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (tabs.length > 1) {
      const newTabs = tabs.filter(tab => tab.id !== tabId);
      setTabs(newTabs);
      if (activeTabId === tabId) {
        setActiveTabId(newTabs[0].id);
        setUrl(newTabs[0].url);
      }
    }
  };

  const switchToTab = (tabId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setActiveTabId(tabId);
    const tab = tabs.find(t => t.id === tabId);
    if (tab) {
      setUrl(tab.url);
    }
    setShowTabs(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <View style={[styles.safeTopInset, { height: insets?.top ?? 0 }]} />

      {/* Top Browser Bar */}
      <LinearGradient
        colors={['#0b0b0d', '#111115', '#1a1a1f']}
        style={[styles.topBar, { height: topBarHeight }]}
      >
        <View style={styles.controlsRow}>
          <TouchableOpacity
            style={[styles.navButton, !canGoBack && styles.disabledButton]}
            onPress={goBack}
            disabled={!canGoBack}
          >
            <RemixIcon name="arrow-left-s-line" size={20} color="#e8e8ea" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.navButton, !canGoForward && styles.disabledButton]}
            onPress={goForward}
            disabled={!canGoForward}
          >
            <RemixIcon name="arrow-right-s-line" size={20} color="#e8e8ea" />
          </TouchableOpacity>

          <View style={styles.urlPill}>
            <TextInput
              style={styles.urlInput}
              value={url}
              onChangeText={setUrl}
              onSubmitEditing={handleUrlSubmit}
              placeholder="Search or type URL"
              placeholderTextColor="#8b8b92"
              autoCapitalize="none"
              autoCorrect={false}
              numberOfLines={1}
              returnKeyType="go"
            />
          </View>

          <TouchableOpacity style={styles.navButton} onPress={refresh}>
            <RemixIcon name="refresh-line" size={20} color="#e8e8ea" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.navButton} onPress={toggleTabs}>
            <RemixIcon name="stack-line" size={20} color="#e8e8ea" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <LinearGradient
        colors={['rgba(0,0,0,0.92)', 'rgba(0,0,0,0.75)', 'rgba(0,0,0,0)']}
        style={styles.topFade}
      />
 
      {/* WebView */}
      <Animated.View style={[styles.webViewContainer, { opacity: fadeAnim, paddingTop: 0 }] }>
        {hydrated && (
          <WebView
            ref={webViewRef}
            source={{ uri: activeTab?.url || 'https://google.com' }}
            style={styles.webView}
            onNavigationStateChange={handleNavigationStateChange}
            onLoadStart={handleLoadStart}
            onLoad={handleLoad}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            startInLoadingState={true}
            renderLoading={() => (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#1a1a2e" />
              </View>
            )}
          />
        )}
      </Animated.View>

      {/* Tab Switcher (slides up from bottom) */}
      {showTabs && (
        <Animated.View
          style={[
            styles.tabSwitcher,
            { top: tabSheetTopOffset, height: tabSheetHeight },
            {
              transform: [
                {
                  translateY: slideAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-tabSheetHeight, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <View style={styles.tabSheetHeader}>
            <Text style={styles.tabSheetTitle}>{tabs.length} Tabs</Text>
            <TouchableOpacity style={styles.newTabButton} onPress={addNewTab}>
              <RemixIcon name="add-line" size={18} color="#0b0b0d" />
              <Text style={styles.newTabButtonText}>New</Text>
            </TouchableOpacity>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.tabsContainer}>
              {tabs.map((tab) => (
                <TouchableOpacity
                  key={tab.id}
                  style={[styles.tabItem, { width: tabCardWidth, height: tabCardHeight }, activeTabId === tab.id && styles.activeTab]}
                  onPress={() => switchToTab(tab.id)}
                >
                  <Text style={styles.tabTitle} numberOfLines={1}>
                    {tab.title}
                  </Text>
                  <Text style={styles.tabUrl} numberOfLines={1}>
                    {tab.url.replace(/^https?:\/\//, '')}
                  </Text>
                  <TouchableOpacity style={styles.closeTab} onPress={() => closeTab(tab.id)}>
                    <RemixIcon name="close-line" size={14} color="#ffffff" />
                  </TouchableOpacity>
                </TouchableOpacity>
              ))}

              <TouchableOpacity style={[styles.addTab, { width: tabCardWidth * 0.55, height: tabCardHeight }]} onPress={addNewTab}>
                <RemixIcon name="add-line" size={20} color="#ffffff" />
              </TouchableOpacity>
            </View>
          </ScrollView>
        </Animated.View>
      )}

    </SafeAreaView>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <YSpeedifyApp />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    maxWidth: screenWidth,
  },
  safeTopInset: {
    width: '100%',
    backgroundColor: '#000',
  },
  navButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 36,
  },
  disabledButton: {
    opacity: 0.3,
  },
  tabSwitcher: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 84,
    height: Math.min(screenHeight * 0.30, 230),
    backgroundColor: '#0e0e12',
    zIndex: 1000,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.45,
    shadowRadius: 10,
    elevation: 20,
  },
  tabSheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  tabSheetTitle: {
    color: '#e8e8ea',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  newTabButton: {
    height: 30,
    paddingHorizontal: 10,
    borderRadius: 15,
    backgroundColor: '#e8e8ea',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  newTabButtonText: {
    color: '#0b0b0d',
    fontSize: 12,
    fontWeight: '700',
  },
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 8,
    alignItems: 'center',
  },
  tabItem: {
    width: Math.min(180, screenWidth * 0.52),
    height: 86,
    backgroundColor: 'rgba(255, 255, 255, 0.07)',
    borderRadius: 14,
    padding: 12,
    justifyContent: 'space-between',
  },
  activeTab: {
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(232, 232, 234, 0.45)',
  },
  tabTitle: {
    color: '#e8e8ea',
    fontSize: 12,
    fontWeight: '700',
  },
  tabUrl: {
    color: 'rgba(232, 232, 234, 0.65)',
    fontSize: 11,
    marginTop: 4,
  },
  closeTab: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.14)',
  },
  addTab: {
    width: 86,
    height: 86,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.18)',
    borderStyle: 'dashed',
  },
  topBar: {
    width: '100%',
    paddingTop: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
    zIndex: 10,
  },
  topFade: {
    width: '100%',
    height: 22,
    zIndex: 5,
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  urlPill: {
    flex: 1,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    justifyContent: 'center',
    paddingHorizontal: 14,
    minWidth: 0,
  },
  urlInput: {
    color: '#f1f1f4',
    fontSize: 13,
    paddingVertical: 0,
  },
  webViewContainer: {
    flex: 1,
    marginTop: 0,
    paddingBottom: 74,
  },
  webView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a2e',
  },
});

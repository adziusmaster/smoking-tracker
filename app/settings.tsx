import { File, Paths } from 'expo-file-system';
import { useRouter } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { Alert, Linking, Pressable, StyleSheet, View } from 'react-native';
import { PRODUCT_CONTENT } from '@/content/products';
import { SOURCES } from '@/content/sources';
import { deleteEverything, exportAll, saveSettings } from '@/data/repositories';
import { estimateCigarettesBeforeQuitting } from '@/domain/lifetime';
import { formatCount } from '@/domain/format';
import { parseSetupForm, switchProduct, valuesFromSettings, type SetupFormValues } from '@/domain/setupForm';
import { ProductPicker } from '@/ui/ProductPicker';
import QuitMomentPicker from '@/ui/QuitMomentPicker';
import { Body, Button, Caption, Chip, Field, Heading, Label, Screen, Title } from '@/ui/kit';
import { makeStyles } from '@/ui/theme';
import { UsageFields } from '@/ui/UsageFields';
import { usePreferences } from '@/ui/usePreferences';
import { useQuitState } from '@/ui/useQuitState';

/** `area` puts the message next to the button that caused it, whatever else failed to load. */
type Status = { text: string; tone: 'ok' | 'error'; area: 'numbers' | 'data' };

/**
 * The same policy Google Play links from the store listing. Hosted publicly because Play
 * requires a reachable URL, and kept in sync with docs/privacy-policy.md in this repo.
 */
const PRIVACY_POLICY_URL = 'https://lechdigital.nl/projects/cleared/privacy/';

const HELP_LINKS = [
  { label: 'Ikstopnu.nl — Dutch national quit support', url: 'https://www.ikstopnu.nl/' },
  { label: 'NHS Better Health — Quit Smoking', url: 'https://www.nhs.uk/better-health/quit-smoking/' },
];

export default function Settings() {
  const db = useSQLiteContext();
  const router = useRouter();
  const styles = useStyles();
  const { state, error, reload } = useQuitState();

  const [values, setValues] = useState<SetupFormValues | null>(null);
  const [quitMoment, setQuitMoment] = useState<Date | null>(null);
  const [status, setStatus] = useState<Status | null>(null);
  const { preferences, setSound, setVibration, setReason } = usePreferences();
  const [reasonDraft, setReasonDraft] = useState<string | null>(null);
  const reasonShown = reasonDraft ?? preferences.reason;

  // `useQuitState` loads asynchronously, so the first render has `state === null`. Seeding the
  // form with `useState` alone froze whatever default was in scope, and Save then wrote that
  // default over the user's real numbers. Re-seeding is keyed on the STORED settings, as a
  // string, so it runs when a load or a save's reload delivers different numbers — never while
  // the user is part-way through typing.
  const storedKey = state ? JSON.stringify(state.settings) : null;
  useEffect(() => {
    if (!state) return;
    setValues(valuesFromSettings(state.settings));
    setQuitMoment(new Date(state.settings.quitDate));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storedKey]);

  const lifetimeEstimate = state ? estimateCigarettesBeforeQuitting(state.settings) : null;
  const productChanged = state !== null && values !== null && values.product !== state.settings.product;
  const slipCount = state?.slips.length ?? 0;

  const save = async () => {
    if (!state || values === null) return;
    const content = PRODUCT_CONTENT[values.product];
    const result = parseSetupForm(values, {
      quitMoment: quitMoment ?? new Date(state.settings.quitDate),
      now: new Date(),
      currency: state.settings.currency,
      timezone: state.settings.timezone,
      labels: { perDay: content.perDayLabel, perPack: content.perPackLabel, packPrice: content.packPriceLabel },
    });
    if (!result.ok) return setStatus({ text: result.error, tone: 'error', area: 'numbers' });

    try {
      await saveSettings(db, result.settings, new Date());
    } catch {
      return setStatus({ text: 'Couldn’t save that. Your stored numbers are unchanged — please try again.', tone: 'error', area: 'numbers' });
    }
    // The write succeeded; a failed refresh must not be reported as a failed save.
    try {
      await reload();
      setStatus({ text: 'Saved. Every figure has been recalculated.', tone: 'ok', area: 'numbers' });
    } catch {
      setStatus({ text: 'Saved, but couldn’t refresh — reopen Settings to see the new figures.', tone: 'ok', area: 'numbers' });
    }
  };

  const exportData = async () => {
    try {
      const json = await exportAll(db);

      const file = new File(Paths.cache, 'cleared-export.json');
      // The cache file is overwritten on every export, so delete any previous one first.
      if (file.exists) file.delete();
      file.create();
      file.write(json);

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(file.uri, { mimeType: 'application/json', dialogTitle: 'Export your data' });
      } else {
        setStatus({ text: `Saved to ${file.uri}`, tone: 'ok', area: 'data' });
      }
    } catch {
      setStatus({ text: 'Couldn’t write the export file. Nothing was exported — please try again.', tone: 'error', area: 'data' });
    }
  };

  const confirmDelete = () => {
    Alert.alert(
      'Delete everything?',
      'Your quit date, slips, relapses and check-ins will be permanently removed from this phone. There is no cloud copy, so this cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteEverything(db);
            } catch {
              return setStatus({ text: 'Couldn’t delete your data. Nothing was removed — please try again.', tone: 'error', area: 'data' });
            }
            router.replace('/onboarding');
          },
        },
      ],
    );
  };

  return (
    <Screen>
      <View style={styles.topBar}>
        <Button label="Back" variant="quiet" onPress={() => router.back()} />
      </View>
      <Title accessibilityRole="header">Settings</Title>

      <Heading>Your numbers</Heading>
      {/* Nothing editable is rendered until the stored numbers have loaded, so a default
          is never shown to the user as if it were their own figure. */}
      {state && values ? (
        <>
          <Label>What you quit</Label>
          <ProductPicker
            value={values.product}
            onChange={(product) => setValues(switchProduct(values, product, PRODUCT_CONTENT[product].defaultPerPack))}
          />
          <UsageFields values={values} onChange={setValues} section="usage" />
          <UsageFields values={values} onChange={setValues} section="history" />
          <Label>When you quit</Label>
          {quitMoment ? <QuitMomentPicker value={quitMoment} onChange={setQuitMoment} maximumDate={new Date()} /> : null}
          {productChanged && slipCount > 0 ? (
            <Body tone="achieve">
              You have {slipCount} logged {slipCount === 1 ? 'slip' : 'slips'}. {slipCount === 1 ? 'It' : 'They'} will be
              counted as {PRODUCT_CONTENT[values.product].unit.many} from now on.
            </Body>
          ) : null}
          <Button label="Save" onPress={save} />
          {status?.area === 'numbers' ? <StatusLine status={status} /> : null}
          {/* Deliberately NOT called a "lifetime total": that phrase is used on the SOS and
              Log screens for the running figure, which adds every slip and relapse cigarette
              logged since the quit date. This one stops at the quit date. */}
          {lifetimeEstimate !== null ? (
            <Caption tone="faint">
              Estimated cigarettes you smoked before quitting: {formatCount(lifetimeEstimate)}. Worked out from your
              daily rate and how long you smoked — an estimate, not a count.
            </Caption>
          ) : null}
        </>
      ) : (
        <Caption tone="faint">
          {error ? 'Couldn’t load your numbers, so they cannot be edited right now.' : 'Loading your numbers…'}
        </Caption>
      )}

      <Heading>Your reason</Heading>
      <Field
        label="Why are you quitting?"
        hint="Shown to you when a craving hits. Leave empty to hide it."
        value={reasonShown}
        onChangeText={setReasonDraft}
        multiline
        maxLength={280}
      />
      {reasonDraft !== null && reasonDraft !== preferences.reason ? (
        <Button
          label="Save reason"
          variant="secondary"
          onPress={() => {
            void setReason(reasonDraft).then(() => setReasonDraft(null));
          }}
        />
      ) : null}

      <Heading>Sound and vibration</Heading>
      <Caption tone="faint">Used by the craving games and the breathing guide.</Caption>
      <View style={styles.chips}>
        <Chip role="checkbox" label={preferences.sound ? 'Sound on' : 'Sound off'} selected={preferences.sound} onPress={() => void setSound(!preferences.sound)} />
        <Chip role="checkbox" label={preferences.vibration ? 'Vibration on' : 'Vibration off'} selected={preferences.vibration} onPress={() => void setVibration(!preferences.vibration)} />
      </View>

      <Heading>Your data</Heading>
      <Caption tone="faint">
        Everything lives in a database file on this phone. Nothing is uploaded, there is no account, and no analytics
        are collected. That also means an export is your only backup.
      </Caption>
      <Button label="Export as JSON" variant="secondary" onPress={exportData} />
      <Button label="Delete everything" variant="danger" onPress={confirmDelete} />
      {status?.area === 'data' ? <StatusLine status={status} /> : null}
      <Link label="Read the full privacy policy" url={PRIVACY_POLICY_URL} />

      <Heading>Where the claims come from</Heading>
      <Caption tone="faint">
        Every physiological statement in this app is traceable. Two claims that appear in most quit-smoking timelines
        online — nerve endings regrowing at 48 hours and bronchial tubes relaxing at 72 — are deliberately absent,
        because they could not be traced to a primary source.
      </Caption>
      {Object.values(SOURCES).map((source) => (
        <Link key={source.id} label={source.label} url={source.url} />
      ))}

      <Heading>Real help</Heading>
      {HELP_LINKS.map((link) => (
        <Link key={link.url} label={link.label} url={link.url} />
      ))}

      <Caption tone="faint">
        This app is not a medical device and does not provide medical advice. It reports published population-level
        findings, which are not predictions about you. Your GP or a national quitline will do more for your odds than
        any app, including this one.
      </Caption>
    </Screen>
  );
}

function StatusLine({ status }: { status: Status }) {
  return (
    <Body tone={status.tone === 'error' ? 'danger' : 'accent'} accessibilityRole="text">
      {status.text}
    </Body>
  );
}

function Link(props: { label: string; url: string }) {
  const styles = useStyles();
  return (
    <Pressable onPress={() => void Linking.openURL(props.url)} accessibilityRole="link" style={styles.link}>
      <Body tone="accent">{props.label}</Body>
    </Pressable>
  );
}

const useStyles = makeStyles((t) =>
  StyleSheet.create({
    topBar: { flexDirection: 'row', justifyContent: 'flex-start' },
    link: { paddingVertical: t.space.xs },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: t.space.sm },
  }),
);

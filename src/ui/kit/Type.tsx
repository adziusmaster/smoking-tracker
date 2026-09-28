import type { ReactNode } from 'react';
import { StyleSheet, Text, type StyleProp, type TextStyle } from 'react-native';
import { makeStyles, useTheme, type Theme } from '../theme';

export type Tone = 'ink' | 'muted' | 'faint' | 'accent' | 'achieve' | 'danger' | 'onHero';

type Props = {
  children: ReactNode;
  tone?: Tone;
  style?: StyleProp<TextStyle>;
  numberOfLines?: number;
  accessibilityRole?: 'header' | 'text' | 'link';
};

function toneColor(t: Theme, tone: Tone): string {
  switch (tone) {
    case 'ink': return t.color.ink;
    case 'muted': return t.color.muted;
    case 'faint': return t.color.faint;
    case 'accent': return t.color.accentText;
    case 'achieve': return t.color.achieve;
    case 'danger': return t.color.danger;
    case 'onHero': return t.color.onHero;
  }
}

const useStyles = makeStyles((t) =>
  StyleSheet.create({
    title: { fontFamily: t.family.display, fontSize: t.font.title, lineHeight: 28, letterSpacing: -0.2 },
    heading: { fontFamily: t.family.bold, fontSize: t.font.heading, lineHeight: 22 },
    body: { fontFamily: t.family.body, fontSize: t.font.body, lineHeight: 22 },
    label: { fontFamily: t.family.semi, fontSize: t.font.small, lineHeight: 18 },
    caption: { fontFamily: t.family.medium, fontSize: t.font.tiny, lineHeight: 16 },
    eyebrow: { fontFamily: t.family.bold, fontSize: t.font.micro, lineHeight: 13, letterSpacing: 0.8, textTransform: 'uppercase' },
  }),
);

function make(variant: 'title' | 'heading' | 'body' | 'label' | 'caption' | 'eyebrow', defaultTone: Tone) {
  return function Typography({ children, tone, style, numberOfLines, accessibilityRole }: Props) {
    const t = useTheme();
    const styles = useStyles();
    return (
      <Text
        style={[styles[variant], { color: toneColor(t, tone ?? defaultTone) }, style]}
        {...(numberOfLines !== undefined ? { numberOfLines } : {})}
        {...(accessibilityRole !== undefined ? { accessibilityRole } : {})}
      >
        {children}
      </Text>
    );
  };
}

/** Fraunces: screen titles only. */
export const Title = make('title', 'ink');
export const Heading = make('heading', 'ink');
export const Body = make('body', 'ink');
export const Label = make('label', 'ink');
export const Caption = make('caption', 'muted');
/** Small uppercase line above a block, e.g. "What's happening". */
export const Eyebrow = make('eyebrow', 'faint');

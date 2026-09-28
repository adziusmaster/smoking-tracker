import type { ReactNode } from 'react';
import { View } from 'react-native';
import { useTheme } from '../theme';

/**
 * A ring filled clockwise from 12 o'clock, drawn with plain Views (no react-native-svg). Each
 * half of the ring is a clipped box holding a full-size rotating layer whose half-disc sweeps
 * into view; rotating the full-size layer keeps the pivot at the ring's centre.
 */
export function ProgressRing(props: { progress: number; size: number; thickness: number; children?: ReactNode }) {
  const t = useTheme();
  const { size, thickness } = props;
  const half = size / 2;
  const degrees = Math.min(1, Math.max(0, props.progress)) * 360;
  const rightTurn = -180 + Math.min(degrees, 180);
  const leftTurn = -180 + Math.max(0, degrees - 180);
  const inner = size - thickness * 2;

  return (
    <View style={{ width: size, height: size, borderRadius: half, backgroundColor: t.color.line }}>
      <View style={{ position: 'absolute', left: half, top: 0, width: half, height: size, overflow: 'hidden' }}>
        <View style={{ position: 'absolute', left: -half, width: size, height: size, transform: [{ rotate: `${rightTurn}deg` }] }}>
          <View style={{ position: 'absolute', left: half, width: half, height: size, backgroundColor: t.color.accent, borderTopRightRadius: half, borderBottomRightRadius: half }} />
        </View>
      </View>
      <View style={{ position: 'absolute', left: 0, top: 0, width: half, height: size, overflow: 'hidden' }}>
        <View style={{ position: 'absolute', left: 0, width: size, height: size, transform: [{ rotate: `${leftTurn}deg` }] }}>
          <View style={{ position: 'absolute', left: 0, width: half, height: size, backgroundColor: t.color.accent, borderTopLeftRadius: half, borderBottomLeftRadius: half }} />
        </View>
      </View>
      <View
        style={{
          position: 'absolute',
          left: thickness,
          top: thickness,
          width: inner,
          height: inner,
          borderRadius: inner / 2,
          backgroundColor: t.color.bg,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {props.children}
      </View>
    </View>
  );
}

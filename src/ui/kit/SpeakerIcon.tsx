import Svg, { Path } from 'react-native-svg';

/**
 * Our own speaker line icon on a 24-unit grid: the speaker, plus two sound waves when on or a
 * cross when muted. Round caps and joins to match the app's line style.
 */
export function SpeakerIcon(props: { on: boolean; size?: number; color: string; strokeWidth?: number }) {
  const size = props.size ?? 22;
  const stroke = { stroke: props.color, strokeWidth: props.strokeWidth ?? 1.75, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, fill: 'none' };
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M3.5 9.5H7l4.5-4v13L7 14.5H3.5z" {...stroke} />
      {props.on ? (
        <>
          <Path d="M15 9.2a4 4 0 0 1 0 5.6" {...stroke} />
          <Path d="M17.8 6.4a8 8 0 0 1 0 11.2" {...stroke} />
        </>
      ) : (
        <Path d="M15.5 9.5l5 5M20.5 9.5l-5 5" {...stroke} />
      )}
    </Svg>
  );
}

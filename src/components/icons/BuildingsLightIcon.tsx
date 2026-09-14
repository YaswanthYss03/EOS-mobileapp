import Svg, { Path } from "react-native-svg";

// Exact glyph from Phosphor Icons' "Buildings" (light weight) - see
// https://raw.githubusercontent.com/phosphor-icons/core/main/assets/light/buildings-light.svg.
// react-icons (the web package the design referenced, react-icons/pi's
// PiBuildingsLight) is a web-only/react-dom library and can't run in React
// Native, but it's just a thin wrapper around this same Phosphor SVG path -
// rendering that path directly via react-native-svg (already a dependency
// here) reproduces the identical icon on-device instead of substituting a
// different icon set's lookalike.
export function BuildingsLightIcon({ size = 24, color = "#000" }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 256 256" fill={color}>
      <Path d="M240,210H222V96a14,14,0,0,0-14-14H142V32a14,14,0,0,0-21.77-11.64l-80,53.33A14,14,0,0,0,34,85.34V210H16a6,6,0,0,0,0,12H240a6,6,0,0,0,0-12ZM208,94a2,2,0,0,1,2,2V210H142V94ZM46,85.34a2,2,0,0,1,.89-1.66l80-53.34A2,2,0,0,1,130,32V210H46ZM110,112v16a6,6,0,0,1-12,0V112a6,6,0,0,1,12,0Zm-32,0v16a6,6,0,0,1-12,0V112a6,6,0,0,1,12,0Zm0,56v16a6,6,0,0,1-12,0V168a6,6,0,0,1,12,0Zm32,0v16a6,6,0,0,1-12,0V168a6,6,0,0,1,12,0Z" />
    </Svg>
  );
}

import type { SVGProps, ReactNode } from "react";

export interface MacbookProProps extends SVGProps<SVGSVGElement> {
  width?: number | string;
  height?: number | string;
  src?: string;
  children?: ReactNode;
}

export function MacbookPro({
  width = 650,
  height = 400,
  src,
  children,
  ...props
}: MacbookProProps) {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 650 400"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      {/* Outer aluminum display frame */}
      <path
        fill="#a4a5a7"
        d="M79.56,13.18h491.32c7.23,0,13.1,5.87,13.1,13.1v336.61H66.46V26.28c0-7.23,5.87-13.1,13.1-13.1Z"
      />
      {/* Inner display bezel */}
      <path
        fill="#222"
        d="M79.96,14.24h490.45c6.83,0,12.37,5.54,12.37,12.37v336.28H67.59V26.6c0-6.83,5.54-12.37,12.37-12.37Z"
      />
      {/* Black screen border */}
      <path
        fill="#000"
        d="M570.25,15.74H80.34c-6.12,0-11.08,4.96-11.08,11.08v336.07h512.08V26.82c0-6.12-4.96-11.08-11.08-11.08ZM575.74,345.17H74.52V27.31c0-3.31,2.68-5.99,5.99-5.99h489.24c3.31,0,5.99,2.68,5.99,5.99v317.86Z"
      />
      {/* Display Canvas */}
      <rect
        fill="#0d1117"
        x="74.52"
        y="21.32"
        width="501.22"
        rx="5"
        ry="5"
        height="323.85"
      />

      {/* Render children or image inside the exact screen dimensions */}
      {children ? (
        <foreignObject
          x="74.52"
          y="21.32"
          width="501.22"
          height="323.85"
          clipPath="url(#roundedCorners)"
        >
          <div className="w-full h-full overflow-hidden bg-[#0a0c10] text-white">
            {children}
          </div>
        </foreignObject>
      ) : src ? (
        <image
          href={src}
          x="74.52"
          y="21.32"
          width="501.22"
          height="323.85"
          preserveAspectRatio="xMidYMid slice"
          clipPath="url(#roundedCorners)"
        />
      ) : null}

      {/* Hinge & lower bezel strip */}
      <rect fill="#1d1d1d" x="69.09" y="350.51" width="512.11" height="12.48" />

      {/* Camera Notch */}
      <path
        fill="#000"
        d="M298.14,21.02h54.07v6.5c0,1.56-1.27,2.82-2.82,2.82h-48.42c-1.56,0-2.82-1.27-2.82-2.82v-6.5h0Z"
      />
      {/* Camera lens indicator */}
      <path
        fill="#080d4c"
        d="M325.11,25.14c-1.99.03-1.99-3.09,0-3.06,1.99-.03,1.99,3.09,0,3.06Z"
      />

      {/* Aluminum lower chassis base */}
      <path
        fill="#acadaf"
        d="M19.04,362.77h611.92v10.39c0,5.95-4.83,10.79-10.79,10.79H29.83c-5.95,0-10.79-4.83-10.79-10.79v-10.39h0Z"
      />

      {/* Base feet & shadows */}
      <polygon fill="#b9b9bb" points="600.06 385.39 567.29 385.39 565.84 383.95 601.82 383.95 600.06 385.39" />
      <polygon fill="#292929" points="598.73 386.82 568.64 386.82 567.32 385.39 600.35 385.39 598.73 386.82" />
      <polygon fill="#b9b9bb" points="82.64 385.39 49.87 385.39 48.43 383.95 84.41 383.95 82.64 385.39" />
      <polygon fill="#292929" points="81.31 386.82 51.23 386.82 49.9 385.39 82.93 385.39 81.31 386.82" />

      {/* Centered thumb indent cutout for lid opening */}
      <path
        fill="#8f9091"
        d="M278.11,362.6h94.05c0,3.63-2.95,6.58-6.58,6.58h-80.89c-3.63,0-6.58-2.95-6.58-6.58h0Z"
      />

      <defs>
        <clipPath id="roundedCorners">
          <rect
            fill="#ffffff"
            x="74.52"
            y="21.32"
            width="501.22"
            height="323.85"
            rx="5"
            ry="5"
          />
        </clipPath>
      </defs>
    </svg>
  );
}

// Export aliases for flexible imports
export const MacBookPro = MacbookPro;
export default MacbookPro;

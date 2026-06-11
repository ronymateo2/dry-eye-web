import Lottie from "lottie-react";
import animationData from "./quick-log-check.lottie.json";

export function QuickLogCheck() {
  return (
    <div style={{ width: 88, height: 88, display: "grid", placeItems: "center" }}>
      <Lottie
        animationData={animationData}
        loop={false}
        autoplay
        style={{ width: 88, height: 88 }}
      />
    </div>
  );
}

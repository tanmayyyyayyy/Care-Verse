function initBedSensorEmitter(io) {
  let state = {
    weight: 78.5,
    leftPressure: 48,
    rightPressure: 52,
    tiltAngle: 2.0,
    batteryLevel: 78
  };

  setInterval(() => {
    state.weight += (Math.random() - 0.5) * 0.3;
    state.tiltAngle += (Math.random() - 0.5) * 1.2;
    state.leftPressure += Math.floor((Math.random() - 0.5) * 4);
    state.leftPressure = Math.max(10, Math.min(90, state.leftPressure));
    state.rightPressure = 100 - state.leftPressure;

    const imbalance = Math.abs(
      state.leftPressure - state.rightPressure
    );

    const risk =
      Math.abs(state.tiltAngle) > 10 || imbalance > 20
        ? "High"
        : "Low";

    io.emit("bed:sensor", {
      ...state,
      stabilityRisk: risk
    });
  }, 2000);

  console.log("🛏 Smart Bed Digital Twin emitter started");
}

module.exports = { initBedSensorEmitter };
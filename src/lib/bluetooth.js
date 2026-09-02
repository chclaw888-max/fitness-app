/**
 * 透過 Web Bluetooth 連接標準心率藍牙裝置(Heart Rate Service, UUID 0x180D)。
 * 相容大多數藍牙心率帶(Polar、Garmin 心率帶等)與部分手錶的「廣播心率」模式。
 *
 * 注意瀏覽器支援限制：
 * - 需要 Chrome / Edge(桌面或 Android),且必須是 HTTPS 或 localhost
 * - iOS Safari 不支援 Web Bluetooth,蘋果手錶的心率也無法透過網頁直接讀取，
 *   這是 iOS 平台限制，不是這支程式的問題
 * - 使用者必須主動點擊按鈕觸發連接(瀏覽器安全性要求，不能自動連線)
 */

export function isBluetoothSupported() {
  return typeof navigator !== "undefined" && !!navigator.bluetooth;
}

// onReading(bpm: number) 會在每次收到新的心率數值時被呼叫
// 回傳一個 disconnect() 函式，離開訓練畫面時記得呼叫
export async function connectHeartRateMonitor(onReading) {
  if (!isBluetoothSupported()) {
    throw new Error("這個瀏覽器不支援 Web Bluetooth，請改用電腦版 Chrome 或 Android 版 Chrome");
  }

  const device = await navigator.bluetooth.requestDevice({
    filters: [{ services: ["heart_rate"] }],
  });

  const server = await device.gatt.connect();
  const service = await server.getPrimaryService("heart_rate");
  const characteristic = await service.getCharacteristic("heart_rate_measurement");

  const handleValue = (event) => {
    const value = event.target.value; // DataView
    const bpm = parseHeartRate(value);
    if (bpm) onReading(bpm);
  };

  await characteristic.startNotifications();
  characteristic.addEventListener("characteristicvaluechanged", handleValue);

  const disconnect = () => {
    characteristic.removeEventListener("characteristicvaluechanged", handleValue);
    if (device.gatt.connected) device.gatt.disconnect();
  };

  return { deviceName: device.name || "心率裝置", disconnect };
}

// 依照 Bluetooth GATT Heart Rate Measurement 規格解析數值
// flags 位元 0：0 = uint8 心率、1 = uint16 心率
function parseHeartRate(dataView) {
  const flags = dataView.getUint8(0);
  const is16bit = flags & 0x1;
  return is16bit ? dataView.getUint16(1, /* littleEndian= */ true) : dataView.getUint8(1);
}

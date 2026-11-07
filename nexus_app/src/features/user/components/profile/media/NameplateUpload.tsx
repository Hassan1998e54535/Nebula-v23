// SPDX-License-Identifier: Nebula

import {http} from '@app/features/platform/transport/RestTransport';
import type {ProfileCustomization} from '@nexus/schema/src/domains/user/ProfileCustomizationSchemas';
import {useEffect, useRef, useState} from 'react';
import styles from './NameplateUpload.module.css';
type NameplateSettings = ProfileCustomization['nameplateSettings'];

export function NameplateUpload({settings, onChange, disabled, onBusyChange}: {
 settings: NameplateSettings;
 onChange: (patch: Partial<NameplateSettings>) => void;
 disabled?: boolean;
 onBusyChange: (busy: boolean) => void;
}) {
 const [busy, setBusy] = useState(false);
 const [error, setError] = useState('');
 const alive = useRef(true);
 const fileInput = useRef<HTMLInputElement>(null);
 useEffect(() => {
  alive.current = true;
  return () => {alive.current = false; onBusyChange(false);};
 }, [onBusyChange]);
 const upload = async (file: File) => {
  setError('');
  if (file.size > 10 * 1024 * 1024 || !/\.(png|jpe?g|gif|webp)$/i.test(file.name)) {
   setError('Choose a PNG, JPEG, WebP or GIF image smaller than 10 MB.');
   return;
  }
  setBusy(true); onBusyChange(true);
  try {
   const image = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('Unable to read this image'));
    reader.onerror = () => reject(new Error('Unable to read this image'));
    reader.readAsDataURL(file);
   });
   const response = await http.post<{filename: string; animated: boolean}>('/users/@me/nameplate-images', {body: {image}});
   if (!alive.current) return;
   const uploaded = response.body;
   onChange({
    nameplate: 'custom', nameplateImage: uploaded.filename, nameplateCrop: null,
    nameplateUploads: [...settings.nameplateUploads.filter((item) => item.filename !== uploaded.filename), uploaded],
   });
  } catch (failure) {
   if (alive.current) setError(failure instanceof Error ? failure.message : 'Image upload failed. Please try again.');
  } finally {
   if (alive.current) {setBusy(false); onBusyChange(false);}
  }
 };
 return <section className={styles.root} aria-label="Custom nameplate">
  <input ref={fileInput} type="file" accept="image/png,image/jpeg,image/gif,image/webp" hidden disabled={disabled || busy}
   onChange={(event) => {const file = event.target.files?.[0]; event.target.value = ''; if (file) void upload(file);}} />
  <button type="button" disabled={disabled || busy} onClick={() => fileInput.current?.click()}>
   {busy ? 'Uploading image…' : '+ Upload nameplate'}
  </button>
  {error && <p className={styles.error} role="alert">{error}</p>}
  {!!settings.nameplateUploads.length && <div className={styles.uploads}>
   {settings.nameplateUploads.map((item, index) => (
    <button key={item.filename} type="button" disabled={disabled || busy}
     aria-pressed={settings.nameplate === 'custom' && settings.nameplateImage === item.filename}
     onClick={() => onChange({nameplate: 'custom', nameplateImage: item.filename, nameplateCrop: null})}>
     <img src={item.filename} alt="" /> Custom {index + 1}
    </button>
   ))}
  </div>}
 </section>;
}

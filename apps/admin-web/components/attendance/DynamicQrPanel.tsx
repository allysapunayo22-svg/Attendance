"use client";

import { useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabase";

export function DynamicQrPanel() {
  const [eventId, setEventId] = useState("");
  const [token, setToken] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function generate() {
    setErrorMessage(null);
    const { data, error } = await supabase.functions.invoke("generate-qr", {
      body: { eventId, ttlSeconds: 30 }
    });
    if (error) {
      setErrorMessage(error.message);
      return;
    }
    setToken(data.token);
    setExpiresAt(data.expiresAt);
  }

  return (
    <Card>
      <CardHeader>
        <h2 className="text-lg font-bold">Dynamic QR Generator</h2>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-[1fr_auto]">
        <Input value={eventId} onChange={(event) => setEventId(event.target.value)} placeholder="Event ID" />
        <Button onClick={generate} disabled={!eventId}>Generate 30s QR</Button>
        {errorMessage ? <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700 md:col-span-2">{errorMessage}</p> : null}
        {token ? (
          <div className="md:col-span-2 flex flex-wrap items-center gap-4">
            <QRCodeCanvas value={token} size={180} />
            <div className="text-sm text-slate-600">
              <div className="font-semibold text-slate-950">Expires</div>
              <div>{expiresAt ? new Date(expiresAt).toLocaleTimeString() : "-"}</div>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

"use client";

import { useEffect, useState } from "react";

export default function WaveIcon() {
    const [show, setShow] = useState(false);

    useEffect(() => {
        const shouldShow = sessionStorage.getItem("show-login-wave") === "true";

        if (!shouldShow) return;

        sessionStorage.setItem("show-login-wave", "false");
        setShow(true);

        const timer = setTimeout(() => {
            setShow(false);
        }, 2500);

        return () => clearTimeout(timer);
    }, []);

    if (!show) return null;

    return <span className="animate-wave text-2xl">👋</span>;
}

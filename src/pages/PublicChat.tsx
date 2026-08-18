import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import EmojiPicker, { Theme as EmojiTheme } from 'emoji-picker-react';
import apiClient from '../api/apiClient';
import { realtimeApi } from '../api/realtime';
import { useAudioRecorder } from '../hooks/useAudioRecorder';
import { AudioPlayer } from '../components/AudioPlayer';
import { MessageType } from '../enums';
import { 
    Send, Smile, User, Check, CheckCheck, Mic, X, MessageCircle, Lock, Phone, Camera 
} from 'lucide-react';
import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

const generateBackground = (design: any, fallback: string) => {
    if (!design) return fallback;
    if (design.type === 'gradient') {
        return `linear-gradient(${design.direction || 'to right'}, ${design.color1}, ${design.color2 || '#ffffff'})`;
    }
    return design.color1;
};

declare global {
    interface Window {
        fbq: any;
        _fbq: any;
        dataLayer: any[];
        gtag: (...args: any[]) => void;
        ttq: any;
        TiktokAnalyticsObject: any;
    }
}

const PublicChat: React.FC = () => {
    const { slug } = useParams<{ slug: string }>();
    const [visitorToken] = useState<string | null>(() => {
        let token = localStorage.getItem('visitor_token');
        if (!token) {
            token = crypto.randomUUID();
            localStorage.setItem('visitor_token', token);
        }
        return token;
    });
    const [conversationId, setConversationId] = useState<string | null>(null);
    const [chatInfo, setChatInfo] = useState<any>(() => {
        if (!slug) return null;
        try {
            const cached = localStorage.getItem(`chat_info_${slug}`);
            return cached ? JSON.parse(cached) : null;
        } catch { return null; }
    });
    const [inputText, setInputText] = useState('');
    const [showEmoji, setShowEmoji] = useState(false);
    const [messages, setMessages] = useState<any[]>([]);
    const [linkPreview, setLinkPreview] = useState<any>(null);
    const [replyingTo, setReplyingTo] = useState<any>(null);
    const [visitorData, setVisitorData] = useState(() => {
        const params = new URLSearchParams(window.location.search);
        const nameParam = params.get('name');
        const phoneParam = params.get('phone');
        const sourceParam = params.get('source');

        if (nameParam && phoneParam) {
            const taggedName = sourceParam ? `${nameParam} [Form: ${sourceParam}]` : nameParam;
            localStorage.setItem('visitor_name', taggedName);
            localStorage.setItem('visitor_phone', phoneParam);
            const emailParam = params.get('email') || '';
            if (emailParam) localStorage.setItem('visitor_email', emailParam);
            return { name: taggedName, phone: phoneParam, email: emailParam };
        }

        return {
            name: localStorage.getItem('visitor_name') || '',
            phone: localStorage.getItem('visitor_phone') || '',
            email: localStorage.getItem('visitor_email') || ''
        };
    });
    const [onboardingStep, setOnboardingStep] = useState<0 | 1 | 2 | 3>(() => {
        const params = new URLSearchParams(window.location.search);
        if (params.get('name') && params.get('phone')) {
            return 3;
        }
        const name = localStorage.getItem('visitor_name');
        const phone = localStorage.getItem('visitor_phone');
        if (name && phone) return 3;
        return 1; 
    });
    const [showWAPopup, setShowWAPopup] = useState(false);
    const [hasDismissedWaPopup, setHasDismissedWaPopup] = useState(false);
    const [redirectingToWa, setRedirectingToWa] = useState(false);
    const [isInitialLoading, setIsInitialLoading] = useState(true);
    const [showOnboardingForm, setShowOnboardingForm] = useState(false);
    const [showLeadCaptureForm, setShowLeadCaptureForm] = useState(false);
    const hasTriggeredOnboarding = useRef(false);
    const hasShownFormRef = useRef(false);
    const pollIntervalRef = useRef<any>(null);
    const scrollRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const scrollToBottom = () => {
        setTimeout(() => {
            if (scrollRef.current) {
                scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
            }
        }, 100);
    };

    const [isAdminTyping, setIsAdminTyping] = useState(false);
    const typingRef = useRef(false);
    const typingTimeoutRef = useRef<any>(null);

    const { isRecording, recordingTime, formatTime, startRecording, stopRecording, cancelRecording } = useAudioRecorder();
    const queryClient = useQueryClient();

    const initMutation = useMutation({
        mutationFn: (data: any) => apiClient.post('/public/init', data)
    });

    const markReadMutation = useMutation({
        mutationFn: (conversationId: string) => apiClient.post('/public/mark-read', { conversationId, isAdmin: false })
    });

    const sendMsgMutation = useMutation({
        mutationFn: (data: any) => apiClient.post('/public/messages', data)
    });

    useEffect(() => {
        if (slug && visitorToken) {
            const storedName = localStorage.getItem('visitor_name') || undefined;
            const storedPhone = localStorage.getItem('visitor_phone') || undefined;

            initMutation.mutateAsync({ slug, visitorToken, visitorName: storedName, visitorPhone: storedPhone })
                .then(res => {
                    setConversationId(res.data.conversationId);
                    setChatInfo(res.data);
                    localStorage.setItem(`chat_info_${slug}`, JSON.stringify(res.data));
                    setVisitorData({ name: res.data.visitorName || '', phone: res.data.visitorPhone || '', email: res.data.visitorEmail || '' });

                    if (!res.data.leadCaptureEnabled) {
                        setOnboardingStep(3);
                    } else if (res.data.visitorName && res.data.visitorPhone) {
                        setOnboardingStep(3);
                    } else if (res.data.visitorName) {
                        setOnboardingStep(2);
                    } else {
                        setOnboardingStep(1);
                    }
                })
                .catch(err => {
                    console.error('Failed to init public chat:', err);
                });
        }
    }, [slug, visitorToken]);

    useEffect(() => {
        if (!chatInfo?.trackingPixels) return;
        
        const pixels = chatInfo.trackingPixels;

        // Meta Pixel
        if (pixels.facebook && !window.fbq) {
            (function(f: any,b: any,e: any,v: any,n?: any,t?: any,s?: any)
            // @ts-ignore
            {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
            // @ts-ignore
            n.callMethod.apply(n,arguments):n.queue.push(arguments)};
            // @ts-ignore
            if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
            // @ts-ignore
            n.queue=[];t=b.createElement(e);t.async=!0;
            // @ts-ignore
            t.src=v;s=b.getElementsByTagName(e)[0];
            // @ts-ignore
            s.parentNode.insertBefore(t,s)})(window, document,'script',
            'https://connect.facebook.net/en_US/fbevents.js');
            window.fbq('init', pixels.facebook);
            window.fbq('track', 'PageView');
        }

        // Google Analytics
        if (pixels.googleAnalytics && !window.gtag) {
            const script = document.createElement('script');
            script.src = `https://www.googletagmanager.com/gtag/js?id=${pixels.googleAnalytics}`;
            script.async = true;
            document.head.appendChild(script);

            window.dataLayer = window.dataLayer || [];
            function gtag(...args: any[]){window.dataLayer.push(args);}
            window.gtag = gtag;
            window.gtag('js', new Date());
            window.gtag('config', pixels.googleAnalytics);
        }

        // TikTok Pixel
        if (pixels.tiktok && !window.ttq) {
            (function (w: any, d: any, t: any) {
                // @ts-ignore
                w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie"],ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e},ttq.load=function(e,n){var i="https://analytics.tiktok.com/i18n/pixel/events.js";ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=i,ttq._t=ttq._t||{},ttq._t[e]=+new Date,ttq._o=ttq._o||{},ttq._o[e]=n||{};var o=document.createElement("script");o.type="text/javascript",o.async=!0,o.src=i+"?sdkid="+e+"&lib="+t;var a=document.getElementsByTagName("script")[0];a.parentNode.insertBefore(o,a)};
                ttq.load(pixels.tiktok);
                ttq.page();
            })(window, document, 'ttq');
        }

        // Custom Scripts
        if (pixels.customScripts) {
            try {
                const container = document.createElement('div');
                container.innerHTML = pixels.customScripts;
                Array.from(container.querySelectorAll('script')).forEach(oldScript => {
                    const newScript = document.createElement('script');
                    Array.from(oldScript.attributes).forEach(attr => newScript.setAttribute(attr.name, attr.value));
                    newScript.appendChild(document.createTextNode(oldScript.innerHTML));
                    document.head.appendChild(newScript);
                });
            } catch (err) {
                console.error('Failed to inject custom scripts:', err);
            }
        }
    }, [chatInfo?.trackingPixels]);

    const { data: fetchedMessages, isLoading: isMessagesLoading } = useQuery({
        queryKey: ['public-messages', conversationId],
        queryFn: () => apiClient.get(`/public/messages?conversationId=${conversationId}`).then(res => res.data),
        enabled: !!conversationId,
    });

    useEffect(() => {
        if (fetchedMessages) {
            setIsInitialLoading(false);
            setMessages(prev => {
                const newMsgs = fetchedMessages;
                const existingIds = new Set(prev.map(m => m.id));
                const merged = [...prev];
                newMsgs.forEach((msg: any) => {
                    if (existingIds.has(msg.id)) return;
                    const dupeIndex = merged.findIndex(m => (msg.tempId && m.id === msg.tempId) || (m.content === msg.content && m.isFromAdmin === msg.isFromAdmin && m.id.startsWith('temp-')));
                    if (dupeIndex !== -1) merged[dupeIndex] = msg;
                    else merged.push(msg);
                });
                return merged.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
            });
            if (fetchedMessages.length > 0) {
                markReadMutation.mutate(conversationId!);
            }
        }
    }, [fetchedMessages]);

    useEffect(() => {
        if (!conversationId || !visitorToken) return;

        const sseUrl = realtimeApi.getSSEVisitorRealtimeUrl(conversationId, visitorToken);
        
        console.log('[SSE] PublicChat connecting to:', sseUrl);
        const es = new EventSource(sseUrl);

        es.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                console.log('[SSE] PublicChat received event:', data);
                
                if (data.type === 'message' && data.conversationId === conversationId) {
                    const message = data.message;
                    setMessages(prev => {
                        if (prev.some(m => m.id === message.id)) return prev;
                        const dupeIndex = prev.findIndex(m => 
                            (message.tempId && m.id === message.tempId) ||
                            (m.content === message.content && m.isFromAdmin === message.isFromAdmin && m.id.startsWith('temp-'))
                        );
                        const merged = [...prev];
                        if (dupeIndex !== -1) {
                            merged[dupeIndex] = message;
                        } else {
                            merged.push(message);
                        }
                        return merged.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
                    });
                    
                    if (message.isFromAdmin) {
                        markReadMutation.mutate(conversationId);
                    }
                }

                if (data.type === 'mark_read' && data.conversationId === conversationId) {
                    const { isAdmin } = data;
                    setMessages(prev => prev.map(m => m.isFromAdmin === !isAdmin ? { ...m, isRead: true } : m));
                }

                if (data.type === 'typing' && data.conversationId === conversationId) {
                    const { isTyping, isFromAdmin: fromAdmin } = data;
                    if (fromAdmin) {
                        setIsAdminTyping(isTyping);
                    }
                }
            } catch (err) {
                console.error('[SSE] PublicChat parse error:', err);
            }
        };

        es.onerror = (err) => {
            console.error('[SSE] PublicChat connection error:', err);
        };

        return () => {
            es.close();
        };
    }, [conversationId, visitorToken]);


    useEffect(() => {
        if (!chatInfo || !conversationId || isInitialLoading || hasTriggeredOnboarding.current) return;
        const runFlow = async () => {
            hasTriggeredOnboarding.current = true;
            if (chatInfo?.welcomeMessage) {
                const alreadySent = messages.some(m => m.isFromAdmin && m.content === chatInfo.welcomeMessage);
                if (!alreadySent) {
                    await sendBotMessage(chatInfo.welcomeMessage);
                    setTimeout(() => setShowOnboardingForm(true), 1000);
                } else {
                    setShowOnboardingForm(true);
                }
            } else {
                setShowOnboardingForm(true);
            }
        };
        runFlow();
    }, [chatInfo, conversationId, isInitialLoading, messages]);



    const sendBotMessage = async (text: string) => {
        if (!conversationId) return;
        const alreadyExists = messages.some(m => m.isFromAdmin && m.content === text);
        if (alreadyExists) return;

        const tempId = `temp-bot-${Date.now()}`;
        const newMsg: any = {
            id: tempId,
            conversationId,
            content: text,
            isFromAdmin: true,
            isRead: true,
            type: MessageType.TEXT,
            createdAt: new Date().toISOString(),
            tempId,
            replyTo: null
        };

        setMessages(prev => [...prev, newMsg]);
        scrollToBottom();

        try { 
            const res = await sendMsgMutation.mutateAsync({ conversationId, content: text, isFromAdmin: true, tempId }); 
            setMessages(prev => prev.map(m => m.id === tempId ? (res.data?.data || res.data) : m));
        } catch (err) { console.error('Bot err', err); setMessages(prev => prev.filter(m => m.id !== tempId)); }
    };

    const subscribeToPushNotifications = async () => {
        try {
            if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
            const permission = await Notification.requestPermission();
            if (permission !== 'granted') return;
            
            const registration = await navigator.serviceWorker.register('/sw.js');
            await navigator.serviceWorker.ready;
            
            let subscription = await registration.pushManager.getSubscription();
            if (!subscription) {
                const res = await apiClient.get('/push/vapidPublicKey');
                const vapidPublicKey = res.data.publicKey;
                const convertedVapidKey = urlBase64ToUint8Array(vapidPublicKey);
                
                subscription = await registration.pushManager.subscribe({
                    userVisibleOnly: true,
                    applicationServerKey: convertedVapidKey
                });
            }
            
            if (subscription && conversationId) {
                await apiClient.post('/push/subscribe', {
                    subscription,
                    conversationId
                });
            }
        } catch (err) {
            console.error('Error subscribing to push notifications:', err);
        }
    };

    const urlBase64ToUint8Array = (base64String: string) => {
        const padding = '='.repeat((4 - base64String.length % 4) % 4);
        const base64 = (base64String + padding)
            .replace(/\-/g, '+')
            .replace(/_/g, '/');
        const rawData = window.atob(base64);
        const outputArray = new Uint8Array(rawData.length);
        for (let i = 0; i < rawData.length; ++i) {
            outputArray[i] = rawData.charCodeAt(i);
        }
        return outputArray;
    };

    const handleOnboardingSubmit = async () => {
        if (!visitorData.name.trim() || !visitorData.phone.trim() || !visitorData.email.trim() || !conversationId) return;
        const { name, phone, email } = visitorData;
        localStorage.setItem('visitor_name', name);
        localStorage.setItem('visitor_phone', phone);
        localStorage.setItem('visitor_email', email);
        setOnboardingStep(3);
        try {
            await initMutation.mutateAsync({ slug, visitorToken, visitorName: name, visitorPhone: phone, visitorEmail: email });
            const tempIdName = `temp-name-${Date.now()}`;
            const tempIdEmail = `temp-email-${Date.now()}`;
            const tempIdPhone = `temp-phone-${Date.now()}`;
            setMessages(prev => [
                ...prev,
                { id: tempIdName, content: `Name: ${name}`, isFromAdmin: false, createdAt: new Date().toISOString(), type: MessageType.TEXT, tempId: tempIdName },
                { id: tempIdEmail, content: `Email: ${email}`, isFromAdmin: false, createdAt: new Date().toISOString(), type: MessageType.TEXT, tempId: tempIdEmail },
                { id: tempIdPhone, content: `Phone: ${phone}`, isFromAdmin: false, createdAt: new Date().toISOString(), type: MessageType.TEXT, tempId: tempIdPhone }
            ]);
            
            // Send to server so admin sees it too
            const sendPromise1 = sendMsgMutation.mutateAsync({ conversationId, content: `Name: ${name}`, type: MessageType.TEXT, isFromAdmin: false, tempId: tempIdName });
            const sendPromise2 = sendMsgMutation.mutateAsync({ conversationId, content: `Email: ${email}`, type: MessageType.TEXT, isFromAdmin: false, tempId: tempIdEmail });
            const sendPromise3 = sendMsgMutation.mutateAsync({ conversationId, content: `Phone: ${phone}`, type: MessageType.TEXT, isFromAdmin: false, tempId: tempIdPhone });
            
            Promise.allSettled([sendPromise1, sendPromise2, sendPromise3]).then((results) => {
                results.forEach((res, i) => {
                    if (res.status === 'fulfilled') {
                        const tempId = [tempIdName, tempIdEmail, tempIdPhone][i];
                        setMessages(prev => prev.map(m => m.id === tempId ? (res.value.data?.data || res.value.data) : m));
                    }
                });
            });

            setTimeout(() => { sendBotMessage("Perfect! Thank you for sharing your details. How can I help you today?"); }, 800);
            setTimeout(() => { subscribeToPushNotifications(); }, 1500);
        } catch (err) { console.error('Onboarding submit error:', err); }
    };

    const handleSendMessage = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!inputText.trim() || !conversationId) return;
        const content = inputText;
        setInputText('');
        setShowEmoji(false);
        setLinkPreview(null);
        setReplyingTo(null);
        const tempId = `temp-${Date.now()}`;
        addOptimisticMessage(content, MessageType.TEXT, tempId);
        
        // Request push notifications on first user interaction
        if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
            subscribeToPushNotifications();
        }

        try {
            const res = await sendMsgMutation.mutateAsync({ conversationId, content, type: MessageType.TEXT, isFromAdmin: false, tempId, replyToId: replyingTo?.id });
            setMessages(prev => prev.map(m => m.id === tempId ? (res.data?.data || res.data) : m));
        } catch (err) { console.error('Send error:', err); setMessages(prev => prev.filter(m => m.id !== tempId)); }
    };
    const fireLeadEvent = () => {
        if (window.fbq) {
            try { window.fbq('track', 'Lead'); } catch (e) {}
        }
        if (window.gtag) {
            try { window.gtag('event', 'generate_lead'); } catch (e) {}
        }
        if (window.ttq) {
            try { window.ttq.track('SubmitForm'); } catch (e) {}
        }
    };

    const handleWhatsAppRedirect = () => {
        fireLeadEvent();
        if (!chatInfo?.whatsappLink) return;
        
        const customerName = visitorData.name || 'Visitor';
        const customerPhone = visitorData.phone || 'N/A';
        const visitedPage = window.location.href;
        const leadId = conversationId || 'N/A';
        const lastMsg = messages[messages.length - 1]?.content || 'N/A';
        const time = format(new Date(), 'yyyy-MM-dd HH:mm:ss');
        const refLink = window.location.origin + `/chat/${slug}`;
        
        const templateText = `Hi, I visited your website and need support.

Name: ${customerName}
Phone: ${customerPhone}
Visited Page: ${visitedPage}
Lead ID: ${leadId}
Current Issue: ${lastMsg}
Time: ${time}
Reference Link: ${refLink}`;

        const waUrl = new URL(chatInfo.whatsappLink);
        waUrl.searchParams.set('text', templateText);
        
        window.open(waUrl.toString(), '_blank');
        setShowWAPopup(false);
        setHasDismissedWaPopup(true);
    };

    const selectMenuOption = async (opt: any) => {
        if (!conversationId) return;
        const userTempId = 'temp-' + Date.now();
        const optimisticMsg = {
            id: userTempId,
            content: opt.label,
            type: MessageType.TEXT,
            isFromAdmin: false,
            createdAt: new Date().toISOString(),
            isRead: false,
            tempId: userTempId
        };
        
        setMessages(prev => [...prev, optimisticMsg]);
        
        // Request push notifications on first user interaction
        if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
            subscribeToPushNotifications();
        }
        
        try {
            const res = await sendMsgMutation.mutateAsync({
                conversationId,
                content: opt.label,
                type: MessageType.TEXT,
                isFromAdmin: false,
                tempId: optimisticMsg.id
            });
            setMessages(prev => prev.map(m => m.id === optimisticMsg.id ? res.data : m));
            queryClient.invalidateQueries({ queryKey: ['public-messages'] });
        } catch (e) {
            console.error('Failed to send menu option reply', e);
        }
    };

    const handleTyping = () => {
        if (!conversationId) return;
        if (!typingRef.current) {
            typingRef.current = true;
            apiClient.post('/realtime/typing', { conversationId, isTyping: true, isFromAdmin: false }).catch(() => {});
        }
        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
        }
        typingTimeoutRef.current = setTimeout(() => {
            typingRef.current = false;
            apiClient.post('/realtime/typing', { conversationId, isTyping: false, isFromAdmin: false }).catch(() => {});
        }, 2000);
    };

    const addOptimisticMessage = (content: string, type: MessageType = MessageType.TEXT, tempId?: string) => {
        const tid = tempId || `temp-${Date.now()}`;
        const optimisticMsg: any = { id: tid, tempId: tid, conversationId, content, type, isFromAdmin: false, isRead: false, createdAt: new Date().toISOString(), linkPreview, replyTo: replyingTo, replyToId: replyingTo?.id };
        setMessages(prev => [...prev, optimisticMsg]);
    };

    const sendVoiceMessage = async () => {
        if (!conversationId) return;
        if (onboardingStep < 3) return;
        const audioBase64 = await stopRecording();
        if (!audioBase64) return;
        const tempId = `temp-${Date.now()}`;
        addOptimisticMessage(audioBase64, MessageType.AUDIO, tempId);
        try {
            const res = await sendMsgMutation.mutateAsync({ conversationId, content: audioBase64, type: MessageType.AUDIO, isFromAdmin: false, tempId });
            setMessages(prev => prev.map(m => m.id === tempId ? (res.data?.data || res.data) : m));
        } catch (err) { setMessages(prev => prev.filter(m => m.id !== tempId)); }
    };

    const sendImageMessage = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !conversationId) return;
        if (onboardingStep < 3) return;
        
        const reader = new FileReader();
        reader.onloadend = async () => {
            const base64String = reader.result as string;
            
            if (fileInputRef.current) fileInputRef.current.value = '';
            
            const tempId = `temp-${Date.now()}`;
            addOptimisticMessage(base64String, MessageType.IMAGE, tempId);
            
            try {
                const res = await sendMsgMutation.mutateAsync({ conversationId, content: base64String, type: MessageType.IMAGE, isFromAdmin: false, tempId });
                setMessages(prev => prev.map(m => m.id === tempId ? (res.data?.data || res.data) : m));
            } catch (err) { setMessages(prev => prev.filter(m => m.id !== tempId)); }
        };
        reader.readAsDataURL(file);
    };

    useEffect(() => {
        scrollToBottom();
        const customerMsgs = messages.filter(m => !m.isFromAdmin);
        
        const isDataFilled = visitorData.name || visitorData.phone || visitorData.email;
        const formThreshold = chatInfo?.leadCaptureDelay ?? 3;
        
        if (chatInfo?.leadCaptureFormId && customerMsgs.length >= formThreshold && !hasShownFormRef.current && !isDataFilled) {
            const lastMsg = messages[messages.length - 1];
            if (lastMsg && !lastMsg.isFromAdmin) {
                hasShownFormRef.current = true;
                setShowLeadCaptureForm(true);
                return;
            }
        }

        const waThreshold = chatInfo?.whatsappThreshold || 5;
        // Replaced modal popup with inline chat prompt
    }, [messages.length, chatInfo, visitorData]);

    useEffect(() => {
        const handleMessage = async (event: MessageEvent) => {
            if (event.data?.type === 'LEAD_CAPTURE_SUCCESS') {
                setShowLeadCaptureForm(false);
                fireLeadEvent();
                
                const formData = event.data.formData || {};
                let name = formData['Name'] || formData['First Name'] || formData['Full Name'] || formData['name'] || formData['first_name'] || formData['full_name'];
                let phone = formData['Phone'] || formData['Phone Number'] || formData['WhatsApp Number'] || formData['phone'] || formData['phone_number'];
                let email = formData['Email'] || formData['Email Address'] || formData['email'] || formData['email_address'];

                if (name || phone || email) {
                    if (name) localStorage.setItem('visitor_name', name);
                    if (phone) localStorage.setItem('visitor_phone', phone);
                    if (email) localStorage.setItem('visitor_email', email);
                    
                    setVisitorData(prev => ({
                        name: name || prev.name,
                        phone: phone || prev.phone,
                        email: email || prev.email
                    }));

                    if (slug && visitorToken) {
                        try {
                            await initMutation.mutateAsync({ 
                                slug, 
                                visitorToken, 
                                visitorName: name, 
                                visitorPhone: phone, 
                                visitorEmail: email 
                            });
                        } catch (e) {
                            console.error('Failed to update visitor info from form submission', e);
                        }
                    }
                }

                if (chatInfo?.whatsappOnFormSubmit && chatInfo?.whatsappLink) {
                    setRedirectingToWa(true);
                    setTimeout(() => {
                        window.location.href = chatInfo.whatsappLink;
                    }, 2000);
                }

                if (conversationId) {
                    let formText = '📝 *Form Submitted*\n';
                    Object.entries(formData).forEach(([key, value]) => {
                        formText += `${key}: ${value}\n`;
                    });
                    
                    const tempId = `temp-form-${Date.now()}`;
                    setMessages(prev => [
                        ...prev,
                        { id: tempId, content: formText.trim(), isFromAdmin: false, createdAt: new Date().toISOString(), type: MessageType.TEXT, tempId }
                    ]);
                    
                    try {
                        const res = await sendMsgMutation.mutateAsync({ 
                            conversationId, 
                            content: formText.trim(), 
                            type: MessageType.TEXT, 
                            isFromAdmin: false, 
                            tempId 
                        });
                        setMessages(prev => prev.map(m => m.id === tempId ? (res.data?.data || res.data) : m));
                    } catch (err) {
                        console.error('Failed to send form details message', err);
                        setMessages(prev => prev.filter(m => m.id !== tempId));
                    }
                }
            }
        };
        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, [chatInfo, slug, visitorToken, conversationId]);

    const onEmojiClick = (emojiData: any) => { setInputText(prev => prev + emojiData.emoji); };

    const groupMessagesByDate = (msgs: any[]) => {
        const groups: { [key: string]: any[] } = {};
        msgs.forEach(msg => { const date = format(new Date(msg.createdAt), 'yyyy-MM-dd'); if (!groups[date]) groups[date] = []; groups[date].push(msg); });
        return groups;
    };

    const formatMessageText = (text: string) => {
        if (!text) return null;
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        const parts = text.split(urlRegex);
        return parts.map((part, i) => {
            if (part.match(urlRegex)) return <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="text-blue-400 underline">{part}</a>;
            return <span key={i}>{part.split('\n').map((line, j) => <React.Fragment key={j}>{j > 0 && <br />}{line}</React.Fragment>)}</span>;
        });
    };

    const renderMessageContent = (msg: any) => {
        if (msg.isFromAdmin && msg.content && typeof msg.content === 'string' && msg.content.startsWith('<p>')) {
            return (
                <div 
                    dangerouslySetInnerHTML={{ __html: msg.content }} 
                    className="prose prose-sm prose-invert max-w-none w-fit inline-block overflow-hidden whitespace-normal break-words [word-break:break-word] [&_*]:break-words [&>p]:m-0 [&>p]:leading-normal [&_img]:max-w-[200px] [&_img]:rounded-lg [&_img]:my-2"
                />
            );
        }
        return formatMessageText(msg.content);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter') { if (e.shiftKey || e.metaKey || e.ctrlKey || window.innerWidth <= 768) return; e.preventDefault(); handleSendMessage(e as unknown as React.FormEvent); }
    };

    const getDateLabel = (dateStr: string) => {
        if (format(new Date(), 'yyyy-MM-dd') === dateStr) return 'TODAY';
        if (format(new Date(Date.now() - 86400000), 'yyyy-MM-dd') === dateStr) return 'YESTERDAY';
        return format(new Date(dateStr), 'MMMM d, yyyy');
    };

    const LinkPreview = ({ preview }: { preview: any }) => {
        if (!preview) return null;
        return (
            <div className="bg-black/20 rounded-lg mb-2 border-l-4 border-emerald-500 overflow-hidden flex flex-col">
                {preview.image && <img src={preview.image} alt="Preview" className="w-full max-h-36 object-cover" />}
                <div className="p-3">
                    <div className="font-bold text-xs text-emerald-400 mb-1">{preview.title}</div>
                    <div className="text-[11px] opacity-80">{preview.description}</div>
                </div>
            </div>
        );
    };

    return (
        <div className="flex flex-col w-full bg-[#0b141a] md:bg-slate-900 font-sans md:items-center md:justify-center md:p-6" style={{ height: '100dvh' }}>
            <div 
                className="flex flex-col w-full h-full md:max-h-[850px] md:max-w-[450px] md:rounded-[2rem] md:shadow-2xl overflow-hidden relative md:border md:border-[#2a3942] shrink-0"
                style={{ background: generateBackground(chatInfo?.chatDesign?.chatBackground, '#0b141a') }}
            >
                {/* Background Pattern Overlay */}
                <div className="absolute inset-0 opacity-5 pointer-events-none bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]" />


                    {/* Header */}
                    <div 
                        className="h-16 px-4 flex items-center justify-between z-10 border-b border-[#111b21] shrink-0 shadow-md relative"
                        style={{ 
                            ...(chatInfo?.chatBackgroundImage 
                                ? { backgroundImage: `url(${chatInfo.chatBackgroundImage})`, backgroundSize: 'cover', backgroundPosition: 'center' } 
                                : { background: generateBackground(chatInfo?.chatDesign?.headerBackground, '#202c33') }
                            )
                        }}
                    >
                        {chatInfo?.chatBackgroundImage && <div className="absolute inset-0 bg-black/30" />}
                        <div className="flex items-center gap-3 relative z-10">
                            {chatInfo?.adminLogo ? (
                                <img src={chatInfo.adminLogo} alt="Logo" className="w-10 h-10 rounded-full object-cover border border-[#374248]" />
                            ) : (
                                <div className="w-10 h-10 rounded-full bg-[#6a7175] text-white flex items-center justify-center font-bold text-sm shrink-0">
                                    <User className="w-5 h-5" />
                                </div>
                            )}
                            <div className="min-w-0">
                                <h2 className="text-white text-base font-bold truncate m-0">{chatInfo?.adminName || 'Agent'}</h2>
                                {chatInfo?.isOnline !== false ? (
                                    <span className="text-xs text-emerald-400 flex items-center gap-1 font-medium">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse" /> Online
                                    </span>
                                ) : (
                                    <span className="text-xs text-amber-500 flex items-center gap-1 font-medium">
                                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block animate-pulse" /> Offline (WhatsApp Handoff Ready)
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Persistent WhatsApp Banner */}
                    {chatInfo?.whatsappLink && messages.filter(m => !m.isFromAdmin).length >= (chatInfo?.whatsappThreshold || 5) && !showWAPopup && (
                        <div 
                            className="w-full bg-[#1e2b33] border-b border-[#2a3942] py-2 px-4 flex items-center justify-between shadow-sm z-10 shrink-0 cursor-pointer hover:bg-[#25353f] transition-colors"
                            onClick={handleWhatsAppRedirect}
                        >
                            <div className="flex items-center gap-2 text-[#25d366]">
                                <MessageCircle className="w-4 h-4" />
                                <span className="text-xs font-bold uppercase tracking-wider text-white">Continue in WhatsApp</span>
                            </div>
                            <span className="text-[10px] text-white/50 bg-black/20 px-2 py-0.5 rounded-full">Recommended</span>
                        </div>
                    )}

                    {/* Messages Area */}
                    <div className="flex-1 overflow-y-auto px-4 py-6 flex flex-col z-10 custom-scrollbar space-y-4" ref={scrollRef}>
                        <div className="flex justify-center mb-4">
                            <div className="bg-[#182229] px-4 py-2 rounded-xl text-[#ffd279] text-[11px] flex items-center gap-2 shadow-sm max-w-sm text-center border border-[#233138]">
                                <Lock className="w-3.5 h-3.5 shrink-0" /> Messages are end-to-end encrypted.
                            </div>
                        </div>

                        {Object.entries(groupMessagesByDate(messages)).map(([date, dateMsgs]) => (
                            <React.Fragment key={date}>
                                <div className="flex justify-center my-4">
                                    <div 
                                        className="backdrop-blur-xs px-3 py-1 rounded-lg text-white/80 text-[10px] font-bold uppercase tracking-wider shadow-xs border border-white/5"
                                        style={{ background: generateBackground(chatInfo?.chatDesign?.inputBackground, '#202c33') }}
                                    >
                                        {getDateLabel(date)}
                                    </div>
                                </div>

                                {dateMsgs.map((msg: any) => (
                                    <div 
                                        key={msg.tempId || msg.id} 
                                        className={cn(
                                            "max-w-[85%] rounded-2xl p-3 shadow-sm relative text-sm font-normal leading-snug",
                                            !msg.isFromAdmin ? "text-white self-end rounded-tr-none" : "text-[#e9edef] self-start rounded-tl-none"
                                        )}
                                        style={{
                                            background: msg.isFromAdmin 
                                                ? generateBackground(chatInfo?.chatDesign?.adminBubbleBackground, '#202c33')
                                                : generateBackground(chatInfo?.chatDesign?.visitorBubbleBackground, '#005c4b')
                                        }}
                                    >
                                        {msg.replyTo && (
                                            <div className="bg-black/20 p-2 rounded mb-2 border-l-4 border-emerald-500 text-xs text-white/80">
                                                <div className="font-bold text-emerald-400 mb-0.5">
                                                    {!msg.replyTo.isFromAdmin ? 'You' : 'Agent'}
                                                </div>
                                                <div className="line-clamp-2">
                                                    {msg.replyTo.type === MessageType.AUDIO ? '🎤 Voice Message' : msg.replyTo.type === MessageType.IMAGE ? '📷 Image' : msg.replyTo.content}
                                                </div>
                                            </div>
                                        )}
                                        <LinkPreview preview={msg.linkPreview} />
                                        <div className="pr-12 whitespace-pre-wrap break-words min-h-[1.5rem]">
                                            {msg.type === MessageType.AUDIO ? <AudioPlayer src={msg.content} isFromAdmin={msg.isFromAdmin} /> : msg.type === MessageType.IMAGE ? (
                                                <img src={msg.content} alt="Attachment" className="max-w-full rounded-xl cursor-pointer hover:opacity-90 transition-opacity" onClick={() => window.open(msg.content, '_blank')} />
                                            ) : renderMessageContent(msg)}
                                        </div>
                                        <div className="absolute right-2.5 bottom-1.5 flex items-center gap-1 text-[10px] text-[#8696a0]">
                                            <span>{format(new Date(msg.createdAt), 'HH:mm')}</span>
                                            {!msg.isFromAdmin && (
                                                msg.isRead ? <CheckCheck className="w-3.5 h-3.5 text-[#53bdeb]" /> : <Check className="w-3.5 h-3.5 text-[#8696a0]" />
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </React.Fragment>
                        ))}

                        {/* Onboarding Form Bubble */}
                        {onboardingStep < 3 && chatInfo?.leadCaptureEnabled && showOnboardingForm && (
                            <div className="bg-[#202c33] text-[#e9edef] p-5 rounded-2xl shadow-lg max-w-sm w-full self-start border border-[#2a3942] animate-in fade-in slide-in-from-bottom-2 duration-300">
                                <h3 className="text-sm font-bold text-white mb-4 m-0">To help you better, please share your details:</h3>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-[10px] font-bold uppercase tracking-wider text-[#8696a0] mb-1">Full Name</label>
                                        <input 
                                            type="text" 
                                            placeholder="e.g. John Doe"
                                            value={visitorData.name}
                                            onChange={e => setVisitorData(prev => ({ ...prev, name: e.target.value }))}
                                            className="w-full bg-[#2a3942] border border-[#3b4a54] rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/40 transition-all"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold uppercase tracking-wider text-[#8696a0] mb-1">Email Address</label>
                                        <input 
                                            type="email" 
                                            placeholder="e.g. john@example.com"
                                            value={visitorData.email}
                                            onChange={e => setVisitorData(prev => ({ ...prev, email: e.target.value }))}
                                            className="w-full bg-[#2a3942] border border-[#3b4a54] rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/40 transition-all"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold uppercase tracking-wider text-[#8696a0] mb-1">Phone Number</label>
                                        <input 
                                            type="tel" 
                                            maxLength={10}
                                            placeholder="e.g. 9876543210"
                                            value={visitorData.phone}
                                            onChange={e => {
                                                const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                                                setVisitorData(prev => ({ ...prev, phone: val }));
                                            }}
                                            className="w-full bg-[#2a3942] border border-[#3b4a54] rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/40 transition-all"
                                        />
                                    </div>
                                    <button 
                                        disabled={!visitorData.name.trim() || !visitorData.email.trim() || visitorData.phone.length !== 10}
                                        onClick={handleOnboardingSubmit}
                                        className="w-full py-3 bg-[#00a884] hover:bg-[#00a884]/90 disabled:opacity-50 disabled:cursor-not-allowed text-black font-extrabold text-sm rounded-xl transition-all shadow-md"
                                    >
                                        Start Chatting
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Iframe Lead Capture Bubble */}
                        {showLeadCaptureForm && (
                            <div className="bg-[#202c33] text-[#e9edef] rounded-2xl shadow-xl max-w-md w-full self-start border border-[#2a3942] overflow-clip animate-in fade-in slide-in-from-bottom-2 duration-300 my-2">
                                <div className="p-3 bg-[#2a3942]/80 border-b border-[#111b21] font-bold text-xs text-[#00a884] flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-[#00a884] animate-pulse inline-block shrink-0" />
                                    {chatInfo?.leadCaptureMessage || 'Please complete this form to continue:'}
                                </div>
                                <iframe 
                                    src={`/f/${chatInfo?.leadCaptureFormId}?embed=true`} 
                                    className="w-full h-[550px] min-h-[550px] border-none bg-transparent block"
                                    title="Lead Capture"
                                />
                            </div>
                        )}

                        {/* Offline banner */}
                        {chatInfo?.isOnline === false && (
                            <div className="bg-[#202c33] border border-amber-500/30 rounded-2xl p-4 flex flex-col items-center text-center gap-3 shadow-md mx-4 my-2 shrink-0">
                                <div className="text-xs font-bold text-amber-400">Our Agents are Currently Offline</div>
                                <div className="text-[11px] font-semibold text-[#8696a0]">
                                    You can send a message here, or start a direct chat on WhatsApp with our team.
                                </div>
                                <button
                                    onClick={handleWhatsAppRedirect}
                                    className="py-2.5 px-4 bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold text-xs rounded-xl flex items-center gap-2 transition-all shadow-md cursor-pointer"
                                >
                                    <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.003 5.324 5.328 0 11.859 0c3.166.001 6.141 1.233 8.375 3.469 2.235 2.237 3.465 5.212 3.462 8.377-.003 6.535-5.328 11.86-11.859 11.86-2.004-.001-3.973-.51-5.716-1.48L0 24zm6.59-4.846c1.6.95 3.1 1.45 4.6 1.452 5.4 0 9.8-4.4 9.803-9.8.002-2.6-1.01-5.07-2.85-6.91-1.85-1.83-4.3-2.84-6.91-2.84-5.4 0-9.8 4.4-9.8 9.8-.001 1.7.46 3.3 1.35 4.74l-.99 3.6 3.7-.97zm10.4-3.5c-.3-.15-1.7-.85-2.0-.95-.3-.1-.5-.15-.7.15-.2.3-.75.95-.9.1-.15-.15-.3-.45-.3-.45 0-1.7-.6-3.2-1.95-1.16-1-1.95-2.3-2.2-2.7-.2-.3-.02-.45.13-.6.13-.13.3-.35.45-.5.15-.15.2-.25.3-.45.1-.2.05-.4-.02-.55-.07-.15-.7-1.7-.95-2.3-.3-.6-.6-.5-.8-.5-.2 0-.4 0-.6 0-.2 0-.6.1-.9.4-.3.3-1.1 1.1-1.1 2.7 0 1.6 1.2 3.1 1.35 3.3.15.2 2.35 3.6 5.7 5.03.8.34 1.43.55 1.9.7.8.25 1.5.2 2.1.1.65-.1 1.7-.7 2.0-1.4.3-.7.3-1.3.2-1.4-.1-.1-.3-.2-.6-.3z" /></svg>
                                    Chat on WhatsApp Now
                                </button>
                            </div>
                        )}

                        {/* Inline WhatsApp Prompt */}
                        {chatInfo?.whatsappLink && messages.filter(m => !m.isFromAdmin).length >= (chatInfo?.whatsappThreshold || 5) && !hasDismissedWaPopup && (
                            <div className="bg-[#202c33] border border-[#2a3942] rounded-2xl p-4 flex flex-col gap-3 shadow-md mx-4 my-2 shrink-0 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-[#25d366]/10 flex items-center justify-center shrink-0 border border-[#25d366]/20">
                                        <MessageCircle className="w-5 h-5 text-[#25d366]" />
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-bold text-white m-0 leading-tight">Continue on WhatsApp?</h3>
                                        <p className="text-[11px] font-medium text-[#8696a0] m-0 mt-1 leading-tight">Get faster replies and updates directly on your mobile.</p>
                                    </div>
                                </div>
                                <div className="flex gap-2 mt-1">
                                    <button
                                        onClick={handleWhatsAppRedirect}
                                        className="flex-1 py-2.5 bg-[#25d366] hover:bg-[#20bd5a] text-white font-extrabold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-md cursor-pointer"
                                    >
                                        <svg width="12" height="12" fill="currentColor" viewBox="0 0 24 24"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.003 5.324 5.328 0 11.859 0c3.166.001 6.141 1.233 8.375 3.469 2.235 2.237 3.465 5.212 3.462 8.377-.003 6.535-5.328 11.86-11.859 11.86-2.004-.001-3.973-.51-5.716-1.48L0 24zm6.59-4.846c1.6.95 3.1 1.45 4.6 1.452 5.4 0 9.8-4.4 9.803-9.8.002-2.6-1.01-5.07-2.85-6.91-1.85-1.83-4.3-2.84-6.91-2.84-5.4 0-9.8 4.4-9.8 9.8-.001 1.7.46 3.3 1.35 4.74l-.99 3.6 3.7-.97zm10.4-3.5c-.3-.15-1.7-.85-2.0-.95-.3-.1-.5-.15-.7.15-.2.3-.75.95-.9.1-.15-.15-.3-.45-.3-.45 0-1.7-.6-3.2-1.95-1.16-1-1.95-2.3-2.2-2.7-.2-.3-.02-.45.13-.6.13-.13.3-.35.45-.5.15-.15.2-.25.3-.45.1-.2.05-.4-.02-.55-.07-.15-.7-1.7-.95-2.3-.3-.6-.6-.5-.8-.5-.2 0-.4 0-.6 0-.2 0-.6.1-.9.4-.3.3-1.1 1.1-1.1 2.7 0 1.6 1.2 3.1 1.35 3.3.15.2 2.35 3.6 5.7 5.03.8.34 1.43.55 1.9.7.8.25 1.5.2 2.1.1.65-.1 1.7-.7 2.0-1.4.3-.7.3-1.3.2-1.4-.1-.1-.3-.2-.6-.3z" /></svg>
                                        Yes, Open WhatsApp
                                    </button>
                                    <button
                                        onClick={() => setHasDismissedWaPopup(true)}
                                        className="py-2.5 px-4 bg-[#2a3942] hover:bg-[#3b4a54] border border-transparent hover:border-[#8696a0]/20 text-[#e9edef] font-bold text-xs rounded-xl transition-all cursor-pointer"
                                    >
                                        Dismiss
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Menu Options Bubble */}
                        {chatInfo?.menuOptions && chatInfo.menuOptions.length > 0 && messages.filter(m => !m.isFromAdmin).length === 0 && (
                            <div className="flex flex-col gap-2 mx-4 my-2 shrink-0">
                                <div className="text-xs font-bold text-slate-300 ml-1">Select an option:</div>
                                <div className="flex flex-wrap gap-2">
                                    {chatInfo.menuOptions.map((opt: any) => (
                                        <button
                                            key={opt.key}
                                            type="button"
                                            onClick={() => selectMenuOption(opt)}
                                            className="px-3.5 py-2 bg-[#005c4b] hover:bg-[#027560] text-white font-extrabold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
                                        >
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Admin typing indicator bubble */}
                        {isAdminTyping && (
                            <div className="self-start bg-[#202c33] text-[#e9edef] rounded-2xl rounded-tl-none p-3.5 shadow-md text-xs font-semibold flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2 duration-300 ml-4 mb-2 shrink-0">
                                <span className="flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                    <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                    <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                </span>
                                <span>Agent is typing...</span>
                            </div>
                        )}
                    </div>

                    {/* Input Area */}
                    {onboardingStep === 3 && !showLeadCaptureForm && (
                        <div 
                            className="p-3 flex items-center gap-2 z-10 border-t border-[#111b21] shrink-0 relative"
                            style={{ background: generateBackground(chatInfo?.chatDesign?.inputBackground, '#202c33') }}
                        >
                            <button 
                                type="button"
                                onClick={() => setShowEmoji(!showEmoji)} 
                                className="w-10 h-10 flex items-center justify-center text-[#8696a0] hover:text-white transition-colors rounded-xl hover:bg-[#2a3942] shrink-0"
                            >
                                <Smile className="w-6 h-6" />
                            </button>
                            <button 
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="w-10 h-10 flex items-center justify-center text-[#8696a0] hover:text-white transition-colors rounded-xl hover:bg-[#2a3942] shrink-0"
                            >
                                <Camera className="w-6 h-6" />
                            </button>
                            <input 
                                type="file" 
                                ref={fileInputRef} 
                                onChange={sendImageMessage} 
                                accept="image/*" 
                                capture="environment" 
                                className="hidden" 
                            />

                            {showEmoji && (
                                <div className="absolute bottom-16 left-4 z-50 shadow-2xl">
                                    <EmojiPicker theme={EmojiTheme.DARK} onEmojiClick={onEmojiClick} />
                                </div>
                            )}

                            {isRecording ? (
                                <div className="flex-1 bg-[#2a3942] rounded-2xl px-4 py-2 flex items-center justify-between">
                                    <span className="text-red-400 font-mono text-sm font-bold flex items-center gap-2 animate-pulse">
                                        <span className="w-2 h-2 rounded-full bg-red-500 inline-block" /> {formatTime(recordingTime)}
                                    </span>
                                    <div className="flex items-center gap-2">
                                        <button 
                                            type="button" 
                                            onClick={cancelRecording} 
                                            className="w-8 h-8 flex items-center justify-center text-[#8696a0] hover:text-red-400 rounded-lg transition-colors"
                                        >
                                            <X className="w-5 h-5" />
                                        </button>
                                        <button 
                                            type="button" 
                                            onClick={sendVoiceMessage} 
                                            className="w-8 h-8 flex items-center justify-center bg-[#00a884] text-black rounded-lg hover:opacity-90 font-bold transition-opacity"
                                        >
                                            <Send className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <form onSubmit={handleSendMessage} className="flex-1 flex items-end gap-2">
                                    <textarea
                                        rows={1}
                                        placeholder="Type a message..."
                                        value={inputText}
                                        onChange={e => {
                                            setInputText(e.target.value);
                                            handleTyping();
                                        }}
                                        onKeyDown={handleKeyDown}
                                        className="flex-1 bg-[#2a3942] border-none rounded-2xl px-4 py-2.5 text-sm text-white placeholder-[#8696a0] focus:outline-none focus:ring-2 focus:ring-emerald-500/30 transition-all resize-none max-h-32 custom-scrollbar leading-normal"
                                    />
                                    {inputText.trim() ? (
                                        <button 
                                            type="submit" 
                                            className="w-10 h-10 bg-[#00a884] text-black hover:opacity-90 transition-opacity rounded-xl flex items-center justify-center font-bold shrink-0 shadow-sm"
                                        >
                                            <Send className="w-5 h-5" />
                                        </button>
                                    ) : (
                                        <button 
                                            type="button" 
                                            onClick={startRecording}
                                            className="w-10 h-10 text-[#8696a0] hover:text-white hover:bg-[#2a3942] transition-colors rounded-xl flex items-center justify-center shrink-0"
                                        >
                                            <Mic className="w-5 h-5" />
                                        </button>
                                    )}
                                </form>
                            )}
                        </div>
                    )}

                    {/* WhatsApp Redirecting Overlay */}
                    {redirectingToWa && (
                        <div className="absolute inset-0 z-[100] bg-[#0b141a]/95 backdrop-blur-sm flex flex-col items-center justify-center p-6 animate-in fade-in duration-300">
                            <div className="bg-[#202c33] border border-[#2a3942] rounded-2xl p-8 max-w-sm w-full text-center shadow-2xl flex flex-col items-center justify-center gap-4">
                                <div className="relative">
                                    <div className="absolute inset-0 animate-ping rounded-full bg-[#25d366]/20" />
                                    <MessageCircle className="w-14 h-14 text-[#25d366] relative z-10" />
                                </div>
                                <div>
                                    <h3 className="text-white font-bold text-lg mb-1">Connecting to WhatsApp</h3>
                                    <p className="text-[#8696a0] text-sm leading-relaxed">
                                        Please wait while we redirect you to our WhatsApp chat...
                                    </p>
                                </div>
                                <div className="mt-4 flex gap-1.5">
                                    <div className="w-2 h-2 rounded-full bg-[#25d366] animate-bounce" style={{ animationDelay: '0ms' }} />
                                    <div className="w-2 h-2 rounded-full bg-[#25d366] animate-bounce" style={{ animationDelay: '150ms' }} />
                                    <div className="w-2 h-2 rounded-full bg-[#25d366] animate-bounce" style={{ animationDelay: '300ms' }} />
                                </div>
                            </div>
                        </div>
                    )}
            </div>
        </div>
    );
};

export default PublicChat;

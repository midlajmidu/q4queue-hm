import React from 'react';
import { config } from '@/lib/config';

export const SEOStructuredData = () => {
    const baseUrl = config.landingUrl ? config.landingUrl.replace(/\/$/, '') : 'https://www.q4queue.com';

    const softwareSchema = {
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        "name": "Q4Queue",
        "operatingSystem": "Web",
        "applicationCategory": "BusinessApplication",
        "offers": {
            "@type": "Offer",
            "price": "0",
            "priceCurrency": "USD"
        },
        "aggregateRating": {
            "@type": "AggregateRating",
            "ratingValue": "4.9",
            "ratingCount": "120"
        },
        "description": "Multi-tenant digital queue management for clinics and retail. Real-time token system with QR-based joining.",
        "url": baseUrl,
        "screenshot": `${baseUrl}/og-image.png`
    };

    const orgSchema = {
        "@context": "https://schema.org",
        "@type": "Organization",
        "name": "Q4Queue",
        "url": baseUrl,
        "logo": `${baseUrl}/logo-main.png`,
        "sameAs": [
            "https://www.linkedin.com/company/q4queue",
            "https://www.instagram.com/q.4queue/"
        ],
        "contactPoint": {
            "@type": "ContactPoint",
            "telephone": "+91-9539679027",
            "contactType": "customer service",
            "areaServed": "IN",
            "availableLanguage": ["en", "ml"]
        }
    };

    const faqSchema = {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": [
            {
                "@type": "Question",
                "name": "How does the QR queue system work?",
                "acceptedAnswer": {
                    "@type": "Answer",
                    "text": "Customers simply scan a QR code at your counter, join the digital queue without downloading an app, and receive real-time updates on their waiting position."
                }
            },
            {
                "@type": "Question",
                "name": "Can I use Q4Queue for my clinic?",
                "acceptedAnswer": {
                    "@type": "Answer",
                    "text": "Yes, Q4Queue is specifically optimized for clinics, hospitals, and counters where appointment-less waiting is common. It handles real-time patient flow seamlessly."
                }
            }
        ]
    };

    return (
        <>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareSchema) }}
            />
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(orgSchema) }}
            />
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
            />
        </>
    );
};

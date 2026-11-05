// Sanitized VAST responses: fictional advertisers from the design, *.example hosts only.

/** VAST 4.1 linear video, CDATA everywhere, two MP4 renditions. */
export const INLINE_LINEAR = `<?xml version="1.0" encoding="UTF-8"?>
<VAST version="4.1">
  <Ad id="lumen-video-1">
    <InLine>
      <AdSystem><![CDATA[Example Ad Server]]></AdSystem>
      <AdTitle><![CDATA[ Lumen Stream: every match in 4K ]]></AdTitle>
      <Advertiser><![CDATA[Lumen Stream]]></Advertiser>
      <Description><![CDATA[Live sport in 4K HDR. First month free.]]></Description>
      <Impression id="imp-1"><![CDATA[https://ads.example/imp/lumen?cb=[CACHEBUSTING]]]></Impression>
      <Error><![CDATA[https://ads.example/err/lumen?code=[ERRORCODE]]]></Error>
      <Creatives>
        <Creative id="cr-lumen">
          <Linear skipoffset="00:00:05">
            <Duration><![CDATA[00:00:20.500]]></Duration>
            <TrackingEvents>
              <Tracking event="start"><![CDATA[https://ads.example/t/start]]></Tracking>
              <Tracking event="firstQuartile"><![CDATA[https://ads.example/t/q1]]></Tracking>
              <Tracking event="midpoint"><![CDATA[https://ads.example/t/mid]]></Tracking>
              <Tracking event="thirdQuartile"><![CDATA[https://ads.example/t/q3]]></Tracking>
              <Tracking event="complete"><![CDATA[https://ads.example/t/complete]]></Tracking>
              <Tracking event="skip"><![CDATA[https://ads.example/t/skip]]></Tracking>
              <Tracking event="pause"><![CDATA[https://ads.example/t/pause]]></Tracking>
              <Tracking event="resume"><![CDATA[https://ads.example/t/resume]]></Tracking>
              <Tracking event="progress" offset="00:00:10"><![CDATA[https://ads.example/t/progress]]></Tracking>
            </TrackingEvents>
            <VideoClicks>
              <ClickThrough><![CDATA[https://lumen.example/offer]]></ClickThrough>
              <ClickTracking><![CDATA[https://ads.example/click]]></ClickTracking>
            </VideoClicks>
            <MediaFiles>
              <MediaFile delivery="progressive" type="video/mp4" width="1920" height="1080" bitrate="4500"><![CDATA[https://cdn.ads.example/lumen-1080.mp4]]></MediaFile>
              <MediaFile delivery="progressive" type="video/mp4" width="1280" height="720" bitrate="2500"><![CDATA[https://cdn.ads.example/lumen-720.mp4]]></MediaFile>
            </MediaFiles>
          </Linear>
        </Creative>
      </Creatives>
      <Extensions>
        <Extension type="other"><DisplayUrl>https://wrong.example</DisplayUrl></Extension>
        <Extension type="streamready"><DisplayUrl><![CDATA[https://www.lumen.example/4k/]]></DisplayUrl></Extension>
      </Extensions>
    </InLine>
  </Ad>
</VAST>`;

/** VAST 3.0 non-linear static image: the Result card's "laggy" campaign. */
export const INLINE_NONLINEAR = `<VAST version="3.0">
  <Ad id="kestrel-card-1">
    <InLine>
      <AdSystem>Example Ad Server</AdSystem>
      <AdTitle>Fix lag spikes with smart queue management</AdTitle>
      <Description>Kestrel routers keep video smooth when everyone is online.</Description>
      <Impression>https://ads.example/imp/kestrel</Impression>
      <Error>https://ads.example/err/kestrel?code=[ERRORCODE]</Error>
      <Creatives>
        <Creative id="cr-kestrel">
          <NonLinearAds>
            <TrackingEvents>
              <Tracking event="creativeView">https://ads.example/t/kestrel-view</Tracking>
            </TrackingEvents>
            <NonLinear width="1280" height="720">
              <StaticResource creativeType="image/jpeg">https://cdn.ads.example/kestrel.jpg</StaticResource>
              <NonLinearClickThrough>https://kestrel.example/qos?src=tv&amp;c=1</NonLinearClickThrough>
            </NonLinear>
          </NonLinearAds>
        </Creative>
      </Creatives>
      <Extensions>
        <Extension type="streamready">
          <Advertiser>Kestrel Routers</Advertiser>
          <DisplayUrl>kestrel.example/qos</DisplayUrl>
        </Extension>
      </Extensions>
    </InLine>
  </Ad>
</VAST>`;

/** VAST 4.2 companion-only creative with several sizes and one HTML companion. */
export const INLINE_COMPANION = `<VAST version="4.2">
  <Ad id="northwind-1">
    <InLine>
      <AdSystem>Example Ad Server</AdSystem>
      <AdTitle>Whole-home Wi-Fi, no dead zones</AdTitle>
      <Advertiser>Northwind Mesh</Advertiser>
      <Impression>https://ads.example/imp/northwind</Impression>
      <Creatives>
        <Creative>
          <CompanionAds>
            <Companion width="640" height="360">
              <StaticResource creativeType="image/png">https://cdn.ads.example/northwind-640.png</StaticResource>
              <CompanionClickThrough>https://northwind.example/small</CompanionClickThrough>
            </Companion>
            <Companion width="1920" height="1080">
              <StaticResource creativeType="image/png">https://cdn.ads.example/northwind-1920.png</StaticResource>
              <TrackingEvents>
                <Tracking event="creativeView">https://ads.example/t/northwind-view</Tracking>
              </TrackingEvents>
              <CompanionClickThrough>https://northwind.example/mesh</CompanionClickThrough>
            </Companion>
            <Companion width="3840" height="2160">
              <StaticResource creativeType="image/png">https://cdn.ads.example/northwind-4k.png</StaticResource>
            </Companion>
            <Companion width="300" height="250">
              <HTMLResource><![CDATA[<div>html</div>]]></HTMLResource>
            </Companion>
          </CompanionAds>
        </Creative>
      </Creatives>
    </InLine>
  </Ad>
</VAST>`;

/** VAST 2.0 linear, plain text, with renditions the player can't use. */
export const INLINE_VAST2 = `<VAST version="2.0">
  <Ad id="lumen-v2">
    <InLine>
      <AdSystem>Example Ad Server</AdSystem>
      <AdTitle>Lumen Stream</AdTitle>
      <Impression>https://ads.example/imp/v2</Impression>
      <Creatives>
        <Creative>
          <Linear>
            <Duration>00:00:15</Duration>
            <TrackingEvents>
              <Tracking event="start">https://ads.example/t/v2-start</Tracking>
            </TrackingEvents>
            <MediaFiles>
              <MediaFile delivery="streaming" type="application/x-mpegURL" width="1920" height="1080">https://cdn.ads.example/v2.m3u8</MediaFile>
              <MediaFile delivery="progressive" type="video/webm" width="1280" height="720" bitrate="2000">https://cdn.ads.example/v2.webm</MediaFile>
              <MediaFile delivery="progressive" type="video/mp4" width="1280" height="720" bitrate="2000">https://cdn.ads.example/v2.mp4</MediaFile>
            </MediaFiles>
          </Linear>
        </Creative>
      </Creatives>
    </InLine>
  </Ad>
</VAST>`;

/** A linear ad longer than the 30 s cap. */
export const INLINE_LONG_VIDEO = INLINE_VAST2.replace('00:00:15', '00:00:45');

/** Linear with only an HLS stream: nothing the player may use. */
export const INLINE_STREAMING_ONLY = `<VAST version="3.0">
  <Ad id="hls-only">
    <InLine>
      <AdSystem>Example Ad Server</AdSystem>
      <AdTitle>HLS only</AdTitle>
      <Impression>https://ads.example/imp/hls</Impression>
      <Error>https://ads.example/err/hls?code=[ERRORCODE]</Error>
      <Creatives>
        <Creative>
          <Linear>
            <Duration>00:00:15</Duration>
            <MediaFiles>
              <MediaFile delivery="streaming" type="application/x-mpegURL" width="1920" height="1080">https://cdn.ads.example/hls.m3u8</MediaFile>
            </MediaFiles>
          </Linear>
        </Creative>
      </Creatives>
    </InLine>
  </Ad>
</VAST>`;

/** Non-linear without the required AdTitle. */
export const INLINE_MISSING_TITLE = INLINE_NONLINEAR.replace(
  '<AdTitle>Fix lag spikes with smart queue management</AdTitle>',
  '',
);

/** Wrapper with its own trackers, pointing at `next`. */
export function wrapperXml(
  next = 'https://ads.example/inline?cb=[CACHEBUSTING]',
  n = 1,
): string {
  return `<VAST version="3.0">
  <Ad id="wrapper-${n}">
    <Wrapper>
      <AdSystem>Example Ad Server</AdSystem>
      <VASTAdTagURI><![CDATA[${next}]]></VASTAdTagURI>
      <Impression>https://ads.example/imp/wrapper-${n}</Impression>
      <Error>https://ads.example/err/wrapper-${n}?code=[ERRORCODE]</Error>
      <Creatives>
        <Creative>
          <Linear>
            <TrackingEvents>
              <Tracking event="start">https://ads.example/t/wrapper-${n}-start</Tracking>
            </TrackingEvents>
          </Linear>
        </Creative>
        <Creative>
          <NonLinearAds>
            <TrackingEvents>
              <Tracking event="creativeView">https://ads.example/t/wrapper-${n}-view</Tracking>
            </TrackingEvents>
          </NonLinearAds>
        </Creative>
      </Creatives>
    </Wrapper>
  </Ad>
</VAST>`;
}

/** A wrapper that forgot its VASTAdTagURI. */
export const WRAPPER_WITHOUT_URI = wrapperXml().replace(
  /<VASTAdTagURI>.*<\/VASTAdTagURI>/,
  '',
);

/** No fill. */
export const EMPTY = '<VAST version="4.0"/>';

/** No fill, with a "no ad" error tracker. */
export const EMPTY_WITH_ERROR = `<VAST version="3.0">
  <Error><![CDATA[https://ads.example/err/nofill?code=[ERRORCODE]]]></Error>
</VAST>`;

export const MALFORMED = '<VAST version="3.0"><Ad><InLine></Ad></VAST>';

export const NOT_VAST = '<html><body>Not found</body></html>';

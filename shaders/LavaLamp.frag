
    precision highp float;
    uniform vec2 iResolution;
    uniform float iTime;
    uniform vec4 iRands;
    
    varying vec2 vUV;
    
    int randomOctave(in float x)
    {
        return int(floor(x));
    }

    float random(in vec2 x)
    {
        return fract(sin(dot(x.xy, vec2(abs(iRands.x) + 1.0,abs(iRands.y) + 1.0))) *12394.1123450334);
    }
    
    vec2 hash(in vec2 x)
    {
        vec2 k = vec2(abs(iRands.x) + 1.12324905,abs(iRands.y) + 1.12324905);
        // vec2 k = vec2(1.985924124,1.12398585910);

        x = x*k + k.yx;
        return -1.0 + 2.0 * fract(0.025 * k * (x.x*x.y *(x.x + x.y)));
    }

    float noise(in vec2 x)
    {
        vec2 i = floor(x);
        vec2 f = fract(x);

        float a = random(i);
        float b = random(i + vec2(1.0,0.0));
        float c = random(i + vec2(0.0,1.0));
        float d = random(i + vec2(1.0,1.0));

        vec2 u = f * f * (3.0-2.0 * f);

        float n = mix(a,b,u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;

        return n;
    }

    vec3 gradientNoise(in vec2 x)
    {
        vec2 i = floor(x);
        vec2 f = fract(x);
        
        vec2 u = f * f * (3.0 - 2.0 * f);
        vec2 du = 2.0 * f * (1.0 - f);

        vec2 ga = hash(i + vec2(0.0,0.0));
        vec2 gb = hash(i + vec2(1.0,0.0));
        vec2 gc = hash(i + vec2(0.0, 1.0));
        vec2 gd = hash(i + vec2(1.0,1.0));

        float va = dot(ga, f - vec2(0.0,0.0));
        float vb = dot(gb, f - vec2(1.0,0.0));
        float vc = dot(gc, f - vec2(0.0,1.0));
        float vd = dot(gd, f - vec2(1.0,1.0));

        return vec3( va + u.x*(vb-va) + u.y*(vc-va) + u.x*u.y*(va-vb-vc+vd),
                 ga + u.x*(gb-ga) + u.y*(gc-ga) + u.x*u.y*(ga-gb-gc+gd) + 
                 du * (u.yx*(va-vb-vc+vd) + vec2(vb,vc) - va));
    }

    float smoothVoronoi(in vec2 x)
    {
        ivec2 p = ivec2(floor(x));
        vec2 f = fract(x);

        float res = 0.0;
        for(int j = -3; j <= 3; j++){
        for(int i = -3; i <= 3; i++){
            ivec2 b = ivec2(i, j);
            vec2 r = vec2(b) - f + hash(vec2(p) + vec2(b));
            float d = dot(r,r);
            res += 1.0/pow(d,8.0);
        }
        }
        return pow(1.0/res, 1.0/16.0);
    }

    //---------------header---------------------//

    
    #define numOctaves 4
    //input  and Hurst exponent
    //fractal dimension and power spectrum
    //integrate white noise fractionally, given values 0 to 1
    //H = 0 decays slower per octave and is equivalent to pink noise
    //H = 1/2 decays faster and has less high frequencies
    // H = 1 decays fastest, lowest frequency


    float fbm(in vec2 x, in float H)
    {
        // exponential decay of Hurst 
        float gain = exp2(-H);
        // wavelength 
        float freq = 1.0;
        float amplitude = 1.0;
        // output 
        float value = 0.0;
        for(int i = 0; i < numOctaves; i++)
        {
            value += gradientNoise(freq * x).x * amplitude;

            // value += smoothVoronoi(freq * x) * amplitude;

            // value += noise(freq * x) * amplitude;

            // each "octave" is twice the frequency
            freq *= 1.0;
            amplitude *= gain;
        }
        return value;
    }



    float warp(in vec2 p, in float H)
    {
        vec2 q = vec2(fbm(p + vec2(0.0,0.0), H), fbm(p + vec2(0.0,0.0),H));

        return fbm(p + q,H);
    }
    
    //nested fractal brownian motions
    float dualWarp(in vec2 p, in float H, out vec2 q, out vec2 r)
    {
            
        q.x = 
            fbm(p + vec2(fbm(vec2(iTime * iRands.w * 0.01,iTime * iRands.z * 0.01),H),fbm(vec2(iTime * iRands.y * 0.01,iTime * iRands.x * 0.01),H)), H);

        q.y = 
            fbm(p + vec2(fbm(vec2(iTime * iRands.x * 0.01,iTime * iRands.y * 0.01),H),fbm(vec2(iTime * iRands.z * 0.01,iTime * iRands.w * 0.01),H)), H);
     r.x = 
            fbm(p + vec2(0.0 + iTime,0.0 + iTime) + q, H);

        r.y = 
            fbm(p + vec2(0.0 + iTime,0.0 + iTime) + q, H);
        
        float sig = 
            fbm(p + r,H);
        
        return sig;
    }

    float dualWarpStatic(in vec2 p, in float H, out vec2 q, out vec2 r)
    {
        q.x = 
            fbm(p + vec2(0.0,0.0), H);

        q.y = 
            fbm(p + vec2(0.0,0.0), H);

        r.x = 
            fbm(p + vec2(0.0,0.0) + q, H); 

        r.y = 
            fbm(p + vec2(0.0,0.0) + q, H);
        
        float sig = 
            fbm(p + r,H);
        
        return sig;
    }


    void frag(out vec4 fragColor, in vec2 fragCoord){
        vec2 uv = vUV;

        float speed = 0.1;
        vec2 dir = vec2(-1.0,1.0);
        vec2 scale = vec2(2.0);

        //output values from nested fbm
        vec2 q; vec2 r; vec2 p; vec2 g;

        float warp1 = abs(dualWarp(uv * scale, 0.9, q, r));

        float warp2 = fbm(vec2(dualWarp(uv * scale, 0.9, p, g),dualWarp(uv * scale, 0.1, p, g)),0.5);

        float gain = 5.0;

        float min = 0.0;
        vec3 col = vec3(uv.x * abs(iRands.x) + 0.1,uv.y * abs(iRands.y) + 0.1, 0.5 * abs(iRands.z) + 0.1);


        col += min;

        col *= warp1 * gain;    

        vec4 sig = vec4(col,1.0);

        fragColor = sig;
    }

    void main(){
        frag(gl_FragColor, gl_FragCoord.xy);
    }
/** The camera pipeline on the GPU: one fragment shader flips, straightens, crops and color-adjusts a frame. */
import type { CameraConfig } from "./config";
import type { Size } from "./geometry";
import { stageSize, stageUniforms, type Stage } from "./pipeline";

export class WebGlUnavailableError extends Error {
  constructor() {
    super("WebGL is not available");
  }
}

const VERTEX = `
attribute vec2 aPos;
varying vec2 vUv;
void main() {
  // (0,0) is the output's top-left, like image coordinates.
  vUv = vec2(aPos.x * 0.5 + 0.5, 0.5 - aPos.y * 0.5);
  gl_Position = vec4(aPos, 0.0, 1.0);
}`;

const FRAGMENT = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
varying vec2 vUv;
uniform sampler2D uTex;
uniform mat3 uHomography;
uniform vec4 uCrop;
uniform vec2 uFlip;
uniform vec3 uAdjust;
void main() {
  vec2 rectified = uCrop.xy + vUv * uCrop.zw;
  vec3 p = uHomography * vec3(rectified, 1.0);
  vec2 s = p.xy / p.z;
  if (uFlip.x > 0.5) s.x = 1.0 - s.x;
  if (uFlip.y > 0.5) s.y = 1.0 - s.y;
  vec3 c = texture2D(uTex, s).rgb + uAdjust.x;
  c = (c - 0.5) * (1.0 + uAdjust.y) + 0.5;
  float grey = dot(c, vec3(0.2126, 0.7152, 0.0722));
  c = mix(vec3(grey), c, 1.0 + uAdjust.z);
  gl_FragColor = vec4(clamp(c, 0.0, 1.0), 1.0);
}`;

function compile(gl: WebGLRenderingContext, type: number, source: string): WebGLShader {
  const shader = gl.createShader(type)!;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader) ?? "shader error");
  return shader;
}

export class CameraRenderer {
  private gl: WebGLRenderingContext;
  private program: WebGLProgram;
  private texture: WebGLTexture;
  private buffer: WebGLBuffer;
  private uniforms: Record<"tex" | "homography" | "crop" | "flip" | "adjust", WebGLUniformLocation | null>;

  constructor(readonly canvas: HTMLCanvasElement) {
    // preserveDrawingBuffer: the picture must still be there when it is read back for a photo.
    const gl = canvas.getContext("webgl", { preserveDrawingBuffer: true, antialias: false, alpha: false });
    if (!gl) throw new WebGlUnavailableError();
    this.gl = gl;
    const program = gl.createProgram()!;
    gl.attachShader(program, compile(gl, gl.VERTEX_SHADER, VERTEX));
    gl.attachShader(program, compile(gl, gl.FRAGMENT_SHADER, FRAGMENT));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program) ?? "link error");
    this.program = program;
    gl.useProgram(program);
    this.buffer = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const position = gl.getAttribLocation(program, "aPos");
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
    this.texture = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    // Non-power-of-two video frames: no mipmaps, clamp, linear.
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    const at = (name: string) => gl.getUniformLocation(program, name);
    this.uniforms = { tex: at("uTex"), homography: at("uHomography"), crop: at("uCrop"), flip: at("uFlip"), adjust: at("uAdjust") };
  }

  /** Draws `source` through the pipeline up to `stage`; returns the canvas' pixel size. */
  draw(source: TexImageSource, frame: Size, config: CameraConfig, stage: Stage, maxSide: number): Size {
    const { gl, canvas, uniforms } = this;
    const size = stageSize(config, frame, stage, maxSide);
    if (canvas.width !== size.w || canvas.height !== size.h) {
      canvas.width = size.w;
      canvas.height = size.h;
    }
    gl.viewport(0, 0, size.w, size.h);
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
    const u = stageUniforms(config, stage);
    gl.uniform1i(uniforms.tex, 0);
    gl.uniformMatrix3fv(uniforms.homography, false, u.homography);
    gl.uniform4fv(uniforms.crop, u.crop);
    gl.uniform2fv(uniforms.flip, u.flip);
    gl.uniform3fv(uniforms.adjust, u.adjust);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    return size;
  }

  dispose() {
    const { gl } = this;
    gl.deleteTexture(this.texture);
    gl.deleteBuffer(this.buffer);
    gl.deleteProgram(this.program);
  }
}

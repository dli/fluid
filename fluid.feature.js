import { Water } from 'three/examples/jsm/objects/Water.js'

// <script src="wrappedgl.js"></script>
// <script src="utilities.js"></script>
// <script src="camera.js"></script>
// <script src="boxeditor.js"></script>
// <script src="simulator.js"></script>
// <script src="renderer.js"></script>
// <script src="simulatorrenderer.js"></script>
// <script src="slider.js"></script>
// <script src="fluidparticles.js"></script>

function concatenateWords (list) {
  if (list.length === 0) {
    return ''
  } else if (list.length === 1) {
    return "'" + list[0] + "'"
  } else {
    var result = ''
    for (var i = 0; i < list.length; ++i) {
      result += "'" + list[i] + "'"
      if (i < list.length - 1) {
        result += i < list.length - 2 ? ', ' : ' and '
      }
    }

    return result
  }
}

WrappedGL.checkWebGLSupportWithExtensions(['ANGLE_instanced_arrays', 'WEBGL_depth_texture', 'OES_texture_float', 'OES_texture_float_linear', 'OES_texture_half_float', 'OES_texture_half_float_linear'],
  function () { // we have webgl
    document.getElementById('placeholder').outerHTML = document.getElementById('main').innerHTML
    var fluidBox = new FluidParticles()
  }, function (hasWebGL, unsupportedExtensions) {
    document.getElementById('placeholder').outerHTML = document.getElementById('no-support').innerHTML
    if (!hasWebGL) { // webgl not supported
      document.getElementById('error').textContent = 'Unfortunately, your browser does not support WebGL'
    } else {
      document.getElementById('error').textContent = 'Unfortunately, your browser does not support the ' + concatenateWords(unsupportedExtensions) + ' WebGL extension' + (unsupportedExtensions.length > 1 ? 's.' : '.')
    }
  }
)

export default {
  props: {
    oceanSide: { type: 'number', default: 2000 },
    size: { type: 'number', default: 1.0 },
    distortionScale: { type: 'number', default: 3.7 },
    alpha: { type: 'number', default: 1.0 },
    sunColor: { type: 'color', default: 0xffffff },
    waterColor: { type: 'color', default: 0x001e0f }
  },

  render ({ scene, THREE }) {

  }
}

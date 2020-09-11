// import Utilities from "./utilities.js"
import WrappedGL from './wrappedgl.js'
import FluidParticles from './fluidparticles.js'

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

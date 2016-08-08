if (process.env.NODE_ENV !== 'production') {

  //const sourceMap = require('source-map-support')
  //sourceMap.install({environment: 'node'})

  //require('longjohn') // Includes source-map-support.

  // This seems to break sometimes by just printing callsites. Happens with longjohn.
  require('hide-stack-frames-from')('babel-runtime')

  filterInternals()
  //formatStack({sourceMap})
}

////////////////////////////////////////////////////////////////////////////////

// NOTE: Disable long-john when modifying this function.
function filterInternals() {
  const chain = require('stack-chain')
  const sep = require('path').sep
  const _ = require('lodash')
  chain.filter.attach(function(error, frames) {
    function isInternal(callSite) {
      var name = callSite && callSite.getFileName()
      return (name && name.indexOf(sep) === -1)
    }

    const groups = chunkBy(frames, isInternal)
    let out = []
    _(groups).forEach((group, idx) => {
      const isInternal = group[0]
      const frames = group[1]
      // Filter out all Node.js internal frames except if first.
      if (isInternal && idx > 0) {
        // Indicate that a group of internals was filtered.
        // TODO(vjpr): This breaks longjohn for some reason.
        //const emptyFrame = createCallsite('filtered')
        //const emptyFrame = cloneCallSite(frames[0])
        //const emptyFrame = frames[0] // Read-only.
        //out.push(emptyFrame)
        return
      }
      out = out.concat(frames)
    })
    return out
  })
}

// From source-map-support.
//function cloneCallSite(frame) {
//  var object = {};
//  Object.getOwnPropertyNames(Object.getPrototypeOf(frame)).forEach(function(name) {
//    object[name] = /^(?:is|get)/.test(name) ? function() { return frame[name].call(frame); } : frame[name];
//  });
//  object.toString = () => 'yo';
//  return object;
//}

// longjohn will override this.
function formatStack({sourceMap} = {}) {
  const chain = require('stack-chain')
  const fs = require('fs')
  const createCallsiteRecord = require('callsite-record')
  chain.format.replace(function(error, frames) {
    try {
      const wrapped = sourceMap.wrapCallSite(frames[0])
      const fileName = wrapped.getFileName()
      const lineNum = wrapped.getLineNumber()
      const fileContent = fs.existsSync(fileName) && fs.readFileSync(fileName, 'utf8')
      if (fileContent) {
        const callSiteRecord = createCallsiteRecord(error)
        callSiteRecord.lineNum = lineNum
        return callSiteRecord._renderRecord(fileContent, {stack: false})
      }
    } catch (e) {
      // TODO(vjpr): This could be an error with our renderer. Check.
      console.log(e)
    }
    return renderStackTrace()
  })

  function renderStackTrace(error) {
    // This will happen when callsite-record cannot open the source file.
    //   I.e. it is a Node.js internal.
    var lines = [];
    lines.push(error.toString())
    for (var i = 0; i < frames.length; i++) {
      lines.push("    at " + frames[i].toString())
    }
    return lines.join("\n")
  }
}

////////////////////////////////////////////////////////////////////////////////

function chunkBy(collection, predicate, context) {
  const _ = require('lodash')
  var chunks = []
  var prevKey = null
  var chunkValues = []
  _.forEach(collection, function(value) {
    var key = predicate.apply(context, arguments)
    if (key == prevKey) {
      chunkValues.push(value)
    } else {
      // Guard against init values
      if (chunkValues.length) {
        chunks.push([prevKey, chunkValues])
      }
      prevKey = key
      chunkValues = [value]
    }
  })
  // Push hanging values
  if (chunkValues.length) {
    chunks.push([prevKey, chunkValues])
  }
  return chunks
}

////////////////////////////////////////////////////////////////////////////////

// From long-john.
function createCallsite(location) {
  return Object.create({
    getFileName: function() {
      return location
    },
    getLineNumber: function() {
      return null
    },
    getFunctionName: function() {
      return null
    },
    getTypeName: function() {
      return null
    },
    getMethodName: function() {
      return null
    },
    getColumnNumber: function() {
      return null
    },
    isNative: function() {
      return null
    }
  })
}

////////////////////////////////////////////////////////////////////////////////

function formatCode() {

}

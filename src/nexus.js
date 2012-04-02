/*
Nexus 0.0.1
Copyright (c) 2012, Kyle Florence
https://github.com/kflorence/nexus/

Inspiration:
http://arborjs.org/
http://processingjs.org/

The contents of this file are released under the MIT license.
https://github.com/kflorence/nexus/blob/master/license-mit
*/

(function( global, undefined ) {

/*
Utility Functions
*/

var slice = Array.prototype.slice,
	toString = Object.prototype.toString,
	hasOwnProperty = Object.prototype.hasOwnProperty,

	// ECMAScript 5 native function implementations
	nativeForEach = Array.prototype.forEach,
	nativeIndexOf = Array.prototype.indexOf,

	// Determine variable types from JavaScript class names
	type = (function() {
		var name,
			classTypes = {},
			classNames = [ 'Boolean', 'Number', 'String', 'Function', 'Array', 'Date', 'RegExp', 'Object' ];

		each( classNames, function( name ) {
			classTypes[ '[object ' + name + ']' ] = name.toLowerCase();
		});

		return function( obj ) {
			return obj == undefined ?
				String( obj ) : classTypes[ toString.call( obj ) ] || 'object';
		};
	}());

// Generic object/array iteration function (from underscore)
function each( obj, iterator, context ) {
	if ( obj == null ) {
		return;
	}

	if ( nativeForEach && obj.forEach === nativeForEach ) {
		obj.forEach( iterator, context );

	} else if ( type( obj ) === 'array' ) {
		for ( var i = 0, l = obj.length; i < l; i++ ) {
			if ( i in obj && iterator.call( context, obj[ i ], i, obj ) === false ) {
				return;
			}
		}

	} else {
		for ( var key in obj ) {
			if ( hasOwnProperty.call( obj, key ) ) {
				if ( iterator.call( context, obj[ key ], key, obj ) === false ) {
					return;
				}
			}
		}
	}
}

// Merge two or more objects together (from jQuery/underscore)
function extend( target ) {
	var copy, prop, source;

	target = target || {};

	each( slice.call( arguments, 1 ), function( obj ) {
		for ( prop in obj ) {
			source = target[ prop ];
			copy = obj[ prop ];

			// Skip recursive objects
			if ( target === copy ) {
				continue;
			}

			// Recurse on objects
			if ( typeof copy === 'object' && typeof source === 'object' ) {
				target[ prop ] = extend( source, copy );

			// Otherwise, overwrite target with copy (unless undefined)
			} else if ( copy !== undefined ) {
				target[ prop ] = copy;
			}
		}
	});

	return target;
}

// Cross-browser implementation of indexOf
function indexOf( item, arr ) {
	if ( nativeIndexOf && arr.indexOf === nativeIndexOf ) {
		return arr.indexOf( item );
	}

	for ( var i = 0, l = arr.length; i < l; i++ ) {
		if ( arr[ i ] === item ) {
			return i;
		}
	}

	return -1;
}

///////////////////////////////////////////////////////////////////////////////

/*
@Class Nexus
*/

var Nexus = function( state ) {
	this.state = extend({
		friction: 0.3,
		gravity: 0,
		links: {},
		linksById: {},
		linksByName: {},
		nodesById: {},
		nodesByName: {},
		particles: []
	}, state );
};

// Static properties
extend( Nexus, {

	// Expose the utility functions
	each: each,
	extend: extend,
	indexOf: indexOf,
	type: type,

	// Given two Nodes, return the name of the link to those Nodes
	getLinkName: function( nodeFrom, nodeTo ) {
		return nodeFrom.toString() + '->' + nodeTo.toString();
	}
});

// Instance properties
extend( Nexus.prototype, {
	addLink: function( nodeFrom, nodeTo, data ) {
		var link,
			exists,
			nodeFromName,
			nodeToName;

		if ( arguments.length === 1 ) {

			// args: Link[, data]
			if ( nodeFrom instanceof Nexus.Link ) {
				link = nodeFrom;
				data = nodeTo;
				nodeTo = link.nodeTo;
				nodeFrom = link.nodeFrom;

			// args: { nodeFrom, nodeTo[, data ] }
			} else {
				data = nodeFrom.data;
				nodeTo = nodeFrom.nodeto;
				nodeFrom = nodeFrom.nodeFrom;
			}

		// args: nodeFrom, nodeTo[, data ]
		} else {
			nodeFrom = this.getNode( nodeFrom ) || this.addNode( nodeFrom );
			nodeTo = this.getNode( nodeTo ) || this.addNode( nodeTo );
		}

		nodeFromName = nodeFrom.name,
		nodeToName = nodeTo.name;

		if ( !this.state.links[ nodeFromName ] ) {
			this.state.links[ nodeFromName ] = {};
		}

		exists = this.state.links[ nodeFromName ][ nodeToName ];

		if ( !exists ) {
			link = link || new Nexus.Link( nodeFrom, nodeTo, data );

			this.state.links[ nodeFromName ][ nodeToName ] = link;
			this.state.linksById[ link.id ] = link;
			this.state.linksByName[ link.name ] = link;

		} else {
			link = exists;
			extend( link.data, data );
		}

		return link;
	},
	addNode: function( name, data ) {
		var node,
			exists;

		if ( name instanceof Nexus.Node ) {
			node = name;
			name = node.name;

		} else if ( typeof name === 'object' ) {
			data = name.data;
			name = name.name;
		}

		exists = this.state.nodesByName[ name ];

		if ( !exists ) {
			node = node || new Nexus.Node( name, data );

			this.state.nodesById[ node.id ] = node;
			this.state.nodesByName[ node.name ] = node;

		} else {
			node = exists;
			extend( node.data, data );
		}

		return node;
	},
	getLink: function( nodeFrom, nodeTo ) {
		var link;

		// args: link
		if ( arguments.length === 1 ) {
			link = typeof nodeFrom === 'number'
				? this.state.linksById[ nodeFrom ]
				: this.state.linksByName[ nodeFrom.toString() ];

		// args: nodeFrom, nodeTo
		} else {
			nodeFrom = this.getNode( nodeFrom );
			nodeTo = this.getNode( nodeTo );

			if ( nodeFrom && nodeTo ) {
				link = this.state.linksByName[ Nexus.getLinkName( nodeFrom, nodeTo ) ];
			}
		}

		return link;
	},
	getLinksFrom: function( nodeFrom ) {
		var links = {};

		nodeFrom = this.getNode( nodeFrom );

		if ( nodeFrom ) {
			links = this.state.links[ nodeFrom.name ];
		}

		return links;
	},
	getLinksTo: function( nodeTo ) {
		var link,
			nodeToName,
			links = {};

		nodeTo = this.getNode( nodeTo );

		if ( nodeTo ) {
			nodeToName = nodeTo.name;

			each( this.state.links, function( nodeLinks, nodeName ) {
				link = nodeLinks[ nodeToName ];

				if ( link ) {
					links[ nodeName ] = link;
				}
			});
		}

		return links;
	},
	getNode: function( node ) {
		return typeof node === 'number'
			? this.state.nodesById[ node ]
			: this.state.nodesByName[ name.toString() ];
	},
	remove: function( cluster ) {
		// TODO
	},
	removeLink: function( link ) {
		link = this.getLink( link );

		if ( link ) {
			delete this.state.links[ link.nodeFrom.name ][ link.nodeTo.name ];
			delete this.state.linksById[ link.id ];
			delete this.state.linksByName[ link.name ];
		}

		return link;
	},
	removeLinks: function( filter ) {
		// TODO
	},
	removeNode: function( node ) {
		node = this.getNode( node );

		if ( node ) {
			delete this.state.nodesById[ node.id ];
			delete this.state.nodesByName[ node.name ];
		}

		return node;
	},
	removeNodes: function( filter ) {
		// TODO
	}
});

///////////////////////////////////////////////////////////////////////////////

/*
@Class Nexus.Vector
*/

Nexus.Vector = function( x, y, z ) {
	this.x = x || 0;
	this.y = y || 0;
	this.z = z || 0;
};

// Instance properties
extend( Nexus.Vector.prototype, {
	add: function( vector, y, z ) {
		if ( arguments.length === 1 ) {
			this.x += vector;
			this.y += y;
			this.z += z;

		} else {
			this.x += vector.x;
			this.y += vector.y;
			this.z += vector.z;
		}
	},
	angleBetween: function( vector ) {
		return Math.acos( this.dotProduct( vector ) / ( this.magnitude() * vector.magnitude() ) );
	},
	crossProduct: function( vector ) {
		var x = this.x,
			y = this.y,
			z = this.z;

		return new Nexus.Vector(
				y * vector.z - vector.y * z,
				z * vector.x - vector.z * x,
				x * vector.y - vector.x * y );
	},
	distance: function( vector ) {
		var dx = this.x - vector.x,
			dy = this.y - vector.y,
			dz = this.z - vector.z;

		return Math.sqrt( dx * dx + dy * dy + dz * dz );
	},
	divide: function( vector ) {
		if ( arguments.length === 1 ) {
			this.x /= vector;
			this.y /= vector;
			this.z /= vector;

		} else {
			this.x /= vector.x;
			this.y /= vector.y;
			this.z /= vector.z;
		}
	},
	dotProduct: function( vector, y, z ) {
		return arguments.length === 1
				? ( this.x * vector.x + this.y * vector.y + this.z * vector.z )
				: ( this.x * vector + this.y * y + this.z * z );
	},
	get: function() {
		return new Nexus.Vector( this.x, this.y, this.z );
	},
	limit: function( limit ) {
		if ( this.magnitude > limit ) {
			this.normalize();
			this.multiply( limit );
		}
	},
	magnitude: function() {
		var x = this.x,
			y = this.y,
			z = this.z;

		return Math.sqrt( x * x + y * y + z * z );
	},
	multiply: function( vector ) {
		if ( typeof vector === 'number' ) {
			this.x *= vector;
			this.y *= vector;
			this.z *= vector;

		} else {
			this.x *= vector.x;
			this.y *= vector.y;
			this.z *= vector.z;
		}
	},
	normalize: function() {
		var magnitude = this.magnitude();

		if ( magnitude > 0 ) {
			this.divide( magnitude );
		}
	},
	set: function( vector, y, z ) {
		if ( arguments.length === 1 ) {
			this.set(
				vector.x || vector[0] || 0,
				vector.y || vector[1] || 0,
				vector.z || vector[2] || 0 );

		} else {
			this.x = vector;
			this.y = y;
			this.z = z;
		}
	},
	subtract: function( vector, y, z ) {
		if ( typeof vector === 'number' ) {
			this.x -= vector;
			this.y -= y;
			this.z -= z;

		} else {
			this.x -= vector.x;
			this.y -= vector.y;
			this.z -= vector.z;
		}
	},
	toString: function() {
		return '[' + this.x + ', ' + this.y + ', ' + this.z + ']';
	}
});

///////////////////////////////////////////////////////////////////////////////

/*
@Class Nexus.Link
*/

var linkId = 0;

Nexus.Link = function( nodeFrom, nodeTo, data ) {
	if ( arguments.length === 1 ) {
		data = nodeFrom.data;
		nodeTo = nodeFrom.nodeTo;
		nodeFrom = nodeFrom.nodeFrom;
	}

	this.data = data;
	this.id = linkId++;
	this.name = Nexus.getLinkName( nodeFrom, nodeTo );
	this.nodeFrom = nodeFrom;
	this.nodeTo = nodeTo;
};

// Instance properties
extend( Nexus.Link.prototype, {
	toString: function() {
		return this.name;
	}
});

///////////////////////////////////////////////////////////////////////////////

/*
@Class Nexus.Node
*/

var nodeId = 0;

Nexus.Node = function( name, data ) {
	if ( typeof name === 'object' ) {
		data = name;
		name = data.name;
	}

	this.data = data;
	this.id = nodeId++;
	this.name = name || 'Node-' + this.id;
};

// Instance properties
extend( Nexus.Node.prototype, {
	toString: function() {
		return this.name;
	}
});

///////////////////////////////////////////////////////////////////////////////

/*
@Class Nexus.Particle
*/

Nexus.Particle = function( location, mass, force, velocity, death ) {
	if ( arguments.length === 1 ) {
		death = location.death;
		velocity = location.velocity;
		force = location.force;
		mass = location.mass;
		location = location.location;
	}

	this.birth = new Date();
	this.death = death || Infinity;
	this.force = force || new Nexus.Vector( 0, 0, 0 );
	this.location = location || new Nexus.Vector( 0, 0, 0 );
	this.mass = mass || 1;
	this.velocity = velocity || new Nexus.Vector( 0, 0, 0 );
};

///////////////////////////////////////////////////////////////////////////////

// Exports
window.Nexus = Nexus;

})( this );

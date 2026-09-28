'use strict';
const {BarksService}=require('../barks/service.cjs');
const {MapWorkspace}=require('../map/workspace.cjs');
// Formats and disk operations belong to the editors; this module only composes them.
class Documents {
  constructor(options){
    this.barks=new BarksService(options);
    this.map=new MapWorkspace(options);
  }
  barksBoot(...args){return this.barks.boot(...args);}
  barksOpen(...args){return this.barks.open(...args);}
  barksRecover(...args){return this.barks.recover(...args);}
  barksSave(...args){return this.barks.save(...args);}
  barksExport(...args){return this.barks.export(...args);}
  barksRestore(...args){return this.barks.restore(...args);}
  mapBoot(...args){return this.map.mapBoot(...args);}
  mapOpen(...args){return this.map.mapOpen(...args);}
  mapNew(...args){return this.map.mapNew(...args);}
  mapRecover(...args){return this.map.mapRecover(...args);}
  mapSave(...args){return this.map.mapSave(...args);}
  rendererReady(...args){return this.map.rendererReady(...args);}
  mapPreview(...args){return this.map.mapPreview(...args);}
  mapPNG(...args){return this.map.mapPNG(...args);}
  async dispose(){await this.map.dispose();}
}
module.exports={Documents};

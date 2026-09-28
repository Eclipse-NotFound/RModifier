window.loot={...parent.loot,dirty(value){parent.RMHost.state('loot',{dirty:!!value});},pickGame(){return parent.RMHost.chooseGame();}};

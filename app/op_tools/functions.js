module.exports = {
  /* date function */
  ddate : function(dobj){
    var d = dobj ? new Date(dobj) : null;
    d = d ? d.toLocaleString('ja-JP') : "null";
    return d;
  },
}

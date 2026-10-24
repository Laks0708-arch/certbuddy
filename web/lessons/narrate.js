(function(){
const SAY=[[/rds\.force_ssl\s*=\s*1/gi,"the R D S force S S L parameter set to 1"],[/aws:SourceVpce/g,"the source V P C endpoint condition"],[/aws:MultiFactorAuthPresent/g,"the M F A present condition"],[/aws:RequestedRegion/g,"the requested Region condition"],
 [/bucket\.s3-accelerate\.amazonaws\.com/g,"the bucket's accelerate address"],[/\bS3\b/g,"S 3"],[/\bEC2\b/g,"E C 2"],[/\bIAM\b/g,"I A M"],[/\bSQS\b/g,"S Q S"],[/\bSNS\b/g,"S N S"],[/\bSCPs\b/g,"S C Ps"],[/\bSCP\b/g,"S C P"],
 [/\bSSE-KMS\b/g,"S S E K M S"],[/\bSSE-S3\b/g,"S S E S 3"],[/\bKMS\b/g,"K M S"],[/\bACM\b/g,"A C M"],[/\bALB\b/g,"A L B"],[/\bNLB\b/g,"N L B"],[/\bNACLs?\b/g,m=>m.endsWith("s")?"nackles":"nackle"],[/\bSGs?\b/g,m=>m.endsWith("s")?"security groups":"security group"],
 [/\bVPC\b/g,"V P C"],[/\bEBS\b/g,"E B S"],[/\bEFS\b/g,"E F S"],[/\bFSx\b/g,"F S X"],[/\bECS\b/g,"E C S"],[/\bEKS\b/g,"E K S"],[/\bDAX\b/g,"dax"],[/\bAPI\b/g,"A P I"],[/\bDNS\b/g,"D N S"],[/\bTTL\b/g,"time to live"],
 [/\bUDP\b/g,"U D P"],[/\bTCP\b/g,"T C P"],[/\bHTTPS\b/g,"H T T P S"],[/\bHTTP\b/g,"H T T P"],[/\bTLS\b/g,"T L S"],[/\bSSL\b/g,"S S L"],[/\bMFA\b/g,"M F A"],[/\bSSO\b/g,"single sign-on"],[/\bPII\b/g,"personal data"],[/\bWORM\b/g,"write once, read many"],
 [/\bIOPS\b/g,"I O P S"],[/\bNVMe\b/g,"N V M E"],[/\bSMB\b/g,"S M B"],[/\bNFS\b/g,"N F S"],[/\bAD\b/g,"Active Directory"],[/\bHPC\b/g,"high performance computing"],[/\bML\b/g,"machine learning"],[/\bGB\b/g,"gigabytes"],[/\bTB\b/g,"terabytes"],
 [/\bRDS\b/g,"R D S"],[/\bCSV\b/g,"C S V"],[/\bXSS\b/g,"cross-site scripting"],[/\bDDoS\b/g,"D DOS"],[/\bRPO\b/g,"R P O"],[/\bRTO\b/g,"R T O"],[/\bvCPU\b/g,"virtual C P U"],[/\bCPU\b/g,"C P U"],[/\bOS\b/g,"operating system"],[/\bIA\b/g,"infrequent access"],
 [/\bAZs\b/g,"Availability Zones"],[/\bAZ\b/g,"Availability Zone"],[/\bms\b/g,"milliseconds"],[/\bvs\b/g,"versus"],[/\be\.g\./g,"for example"]];
function clean(t){t=t.replace(/→/g," means ").replace(/·/g,". ").replace(/ \/ /g," or ").replace(/\s\+\s/g," and ").replace(/\+/g," plus ").replace(/×/g," times ").replace(/≈/g,"about ").replace(/[()]/g,", ").replace(/\s*:\s*/g,": ");
  SAY.forEach(([re,w])=>{t=t.replace(re,w)});return t.replace(/,\s*\./g,".").replace(/\s+,/g,",").replace(/,\s*,/g,",").replace(/\.\s*\./g,".").replace(/\s+/g," ")}
function narr(s){return clean(s.t+". "+s.story+" The exam key words are: "+s.key+". And watch out for the trap: "+s.trap+".")}
window.NARR={clean:clean,narr:narr};
})();

<?php
/**
 * @author Malte Srocke <maltesrocke@yahoo.de>
 * 
 */
App::uses('AppModel', 'Model');
App::uses('SimpleXMLExtended', 'xml');
App::uses('ReportUtils','util');

class Sichtung extends AppModel {

	public $useTable = 'sichtungen';
    public $sequence = 'public.sichtungen_seq';

    public function __construct($id = false, $table = null, $ds = null) {
        if (!IS_PROD) $this->sequence = 'public.test_sichtungen_seq';
        parent::__construct($id, $table, $ds);
    }
	
	public $actsAs = array('Upload' => array(
										'filenameField'=>'aufnahme',
										'folder'=>'files'
										));
	
	public $validate = array(
        'sichtungsdatum' => array(
            'required' => true,
            'allowEmpty' => false,
            'rule'=>'datetime',
            'message'=> 'Bitte geben Sie ein gültiges Datum an.'
        ),
		'email'=>
			array(
                'required' => true,
                'allowEmpty' => false,
				'rule'=>'email',
				'message'=> 'Bitte geben Sie eine gültige E-Mail-Adresse ein.'
				),
		'anzahl_gesamt'=>
			array(
                'required' => true,
                'rule'    => array('naturalNumber', true),
				'allowEmpty'=>false,
				'message'=>'Dieses Feld kann nicht leer gelassen werden.'
				),
		'anzahl_jung'=>
			array(
                'required' => false,
                'allowEmpty'=>true,
                'rule'    => array('naturalNumber', true),
				'message'=>'Dieses Feld kann nicht leer gelassen werden.'
				),
		'entfernung'=>
			array(
				'rule'=>array('inList', array('0','1','2','3','4','5')),
				'message'=>'Bitte geben Sie eine ungefähre Entfernung an.'
				),
		'vorname'=>
			array(
                'required' => true,
                'allowEmpty'=>false,
                'rule'=> array('maxLength', 64),
				'message'=>'Der Vorname darf nicht länger als 64 Zeichen sein.'
				),
		'name'=>
			array(
                'required' => true,
                'allowEmpty'=>false,
				'rule'=> array('maxLength', 64),
				'message'=>'Der Name darf nicht länger als 64 Zeichen sein.'
				),
		'schiffsname_opt'=>
			array(
                'allowEmpty'=>true,
				'rule'=>'nichtLeerBeiSchiffsnamensnennungJa',
				'message'=>'Bei Nennungswunsch des Schiffsnamens darf dieses Feld nicht leer sein.'
				),
        'verteilung'=>
            array(
                'allowEmpty'=>true,
                'required' => false,
                'rule'=>array('inList', array('0','1','2','3')),
                'message'=>'Der Wert liegt nicht im zugelassenen Bereich (0-3).'
            ),
        'verhalten'=>
            array(
                'allowEmpty'=>true,
                'required' => false,
                'rule'=>array('inList', array('0','1','2','3')),
                'message'=>'Der Wert liegt nicht im zugelassenen Bereich (0-3).'
            ),
        'seegang'=>
            array(
                'allowEmpty'=>true,
                'required' => false,
                'rule'=>array('inList', array('0','1','2','3','4','5')),
                'message'=>'Der Wert liegt nicht im zugelassenen Bereich (0-5).'
            ),
        'bootsantrieb'=>
            array(
                'allowEmpty'=>true,
                'required' => false,
                'rule'=>array('inList', array('0','1','2','3','4')),
                'message'=>'Der Wert liegt nicht im zugelassenen Bereich (0-4).'
            ),
        'eingangskanal'=>
            array(
                'allowEmpty'=>true,
                'required' => false,
                'rule'=>array('inList', array('0','1','2','3','4','5')),
                'message'=>'Der Wert liegt nicht im zugelassenen Bereich (0-5).'
            ),
        'vonwo'=>
            array(
                'allowEmpty'=>true,
                'required' => false,
                'rule'=>array('inList', array('0','1','2','3','4')),
                'message'=>'Der Wert liegt nicht im zugelassenen Bereich (0-4).'
            ),
        'sichtweite'=>
            array(
                'allowEmpty'=>true,
                'required' => false,
                'rule'=>array('inList', array('0','1','2','3','4')),
                'message'=>'Der Wert liegt nicht im zugelassenen Bereich (0-4).'
            ),
        'windrichtung'=>
            array(
                'allowEmpty'=>true,
                'required' => false,
                'rule'=> array('inList', array('N','NW','W','SW','S','SO','O','NO')),
                'message'=>'Bitte geben Sie eine gültige Windrichtung an.'
            ),
        'windstaerke'=>
            array(
                'allowEmpty'=>true,
                'required' => false,
                'rule'=> array('inList', array('0','1','2','3','4','5','6','7','8','9','10','11','12')),
                'message'=>'Bitte geben Sie eine Windstärke zwischen 0 und 12 an.'
            ),
        'schiffsname'=>
            array(
                'allowEmpty'=>true,
                'required' => false,
                'rule'=> array('maxLength', 64),
                'message'=>'Der Schiffsname darf nicht länger als 64 Zeichen sein.'
            ),
        'heimathafen'=>
            array(
                'allowEmpty'=>true,
                'required' => false,
                'rule'=> array('maxLength', 64),
                'message'=>'Der Heimathafen darf nicht länger als 64 Zeichen sein.'
            ),
        'bootstyp'=>
            array(
                'allowEmpty'=>true,
                'required' => false,
                'rule'=> array('maxLength', 64),
                'message'=>'Der Bootstyp darf nicht länger als 64 Zeichen sein.'
            ),
        'strasse'=>
            array(
                'allowEmpty'=>true,
                'required' => false,
                'rule'=> array('maxLength', 64),
                'message'=>'Die Strasse darf nicht länger als 64 Zeichen sein.'
            ),
        'ort'=>
            array(
                'allowEmpty'=>true,
                'required' => false,
                'rule'=> array('maxLength', 64),
                'message'=>'Der Ort darf nicht länger als 64 Zeichen sein.'
            ),
        'plz'=>
            array(
                'allowEmpty'=>true,
                'required' => false,
                'rule'=> array('maxLength', 5),
                'message'=>'Die Postleitzahl darf nicht länger als 5 Zeichen sein.'
            ),
        'telefon'=>
            array(
                'allowEmpty'=>true,
                'required' => false,
                'rule'=> array('maxLength', 64),
                'message'=>'Der Name darf nicht länger als 64 Zeichen sein.'
            ),
        'fax'=>
            array(
                'allowEmpty'=>true,
                'required' => false,
                'rule'=> array('maxLength', 64),
                'message'=>'Die Telefonnummer darf nicht länger als 64 Zeichen sein.'
            ),
        'gps_laenge'=>
            array(
                'allowEmpty'=>true,
                'required' => false,
                'rule'=> array('myRange', -180, 180),
                'message'=>'Der Längengrad muss zwischen -180 und 180 liegen.'
            ),
        'gps_breite'=>
            array(
                'allowEmpty'=>true,
                'required' => false,
                'rule'=> array('myRange', -90, 90),
                'message'=>'Der Breitengrad muss zwischen -90 und 90 liegen.'
            ),
        'totfund_zustand'=>
            array(
                'allowEmpty'=>true,
                'required' => false,
                'rule'=> array('inList', array('0','1','2','3','4','5')),
                'message'=>'Die Auswahl ist ungültig.'
            ),
        'totfund_geschlecht'=>
            array(
                'allowEmpty'=>true,
                'required' => false,
                'rule'=> array('inList', array('0','1','2')),
                'message'=>'Die Auswahl ist ungültig.'
            ),
        'totfund_groesse'=>
            array(
                'allowEmpty' => true,
                'required' => false,
                'rule'    => array('naturalNumber', true),
                'message'=>'Bitte geben Sie eine Zahl ein.'
            )
			);

    public function nichtLeerBeiSchiffsnamensnennungJa($check){
		if(!$this->data['Sichtung']['schiffnamensnennung']){
			return true;
		} else {
			return !empty($check['schiffsname_opt']);
		}
	}

    public function myRange($check, $lower = null, $upper = null) {
        $check = end($check);
        if (!is_numeric($check)) {
            return false;
        }
        if (isset($lower) && isset($upper)) {
            return ($check >= $lower && $check <= $upper);
        }
        return is_finite($check);
    }

    #benutztzahlenarray enthält die spaltennamen, die im add formular auf das array mit den zahlen 1-15 und dann '> 15' (hat dann den wert 16) zugreifen
	#im afterfind wird dann 16 durch > 15 ersetzt...
	public $benutztZahlenArray = array('anzahl_gesamt','anzahl_schiffe','anzahl_jung');

	
	public function massageData($data){
		if(isset($data['sichtungsdatum'])){
			$data['Sichtung']['sichtungsdatum'] = date('Y-m-d H:i',strtotime($data['sichtungsdatum']['datum'].' '.$data['sichtungsdatum']['uhrzeit']['hour'].':'.$data['sichtungsdatum']['uhrzeit']['min']));
			unset($data['sichtungsdatum']);
		}
		if(isset($data['Sichtung']['intern'])){
			if(!$data['Sichtung']['intern']){
				$data['Sichtung']['ostsee'] = 1;
			}
			unset($data['Sichtung']['intern']);
		}
		if(!empty($data['Sichtung']['schiffsname_opt'])){
			$data['Sichtung']['schiffsname'] = $data['Sichtung']['schiffsname_opt'];
			unset($data['Sichtung']['schiffsname_opt']);
		}
		return $data;
	}
	
	public function beforeSave($options = array()){
		foreach($this->data['Sichtung'] as $key=>$val){
			if(empty($val) AND !$this->id){
				unset($this->data['Sichtung'][$key]);
			}
		}
        if (isset($this->data['Sichtung']['gps_laenge']) && isset($this->data['Sichtung']['gps_breite'])) {
            $lon =  floatval($this->data['Sichtung']['gps_laenge']);
            $lat = floatval($this->data['Sichtung']['gps_breite']);
            $obj = new stdClass();
            $obj->type = 'expression';
            $obj->value = 'ST_SetSRID(ST_MakePoint('.$lon.','.$lat.'),4326)';
            $this->data['Sichtung']['location'] = $obj;
            $inBaltic = $this->getPointInBaltic($lon, $lat);
            if ($inBaltic[0][0]['inbaltic']==1) {
                $this->data['Sichtung']['ostsee_geo'] = 2;
            } else if ($inBaltic[0][0]['inchartarea']==1){
                $this->data['Sichtung']['ostsee_geo'] = 1;
            } else {
                $this->data['Sichtung']['ostsee_geo'] = 0;
            }
        }
		return true;
	}

    public function getPointInBaltic($lon, $lat){
        $sql = sprintf("select ST_Contains(geom, ST_SetSRID(ST_MakePoint(%s,%s),4326)) as inBaltic, ST_SetSRID(ST_MakePoint(%s,%s),4326)  && ST_MakeEnvelope(%s,4326) as inChartArea from ne_10m_ocean As Sichtung where id = 2",$lon,$lat,$lon,$lat,QueryParserComponent::$chartBox);
        return $this->query($sql);
    }

    public function getDefaultYear(){
        return (date('n')>3)?date('Y'):date('Y')-1;
    }
	
	public function getDataForEditForm($id = null){
		if($id){
			$this->id = $id;
		}
		$data = $this->read();
		$data['Sichtung']['schiffsname_opt'] = $data['Sichtung']['schiffsname'];
		$data['sichtungsdatum']['datum'] = date('d.m.Y',strtotime($data['Sichtung']['sichtungsdatum']));
		$data['sichtungsdatum']['uhrzeit'] = date('H:i',strtotime($data['Sichtung']['sichtungsdatum']));
		return $data;
	}

    private $excludeMap = array();

	public function afterFind($results, $primary = false){
		if($this->findQueryType != 'all'){
			return $results;
		}
		foreach($results as &$result){
			foreach($this->getAntworten() as $key=>$antworten){
				if(isset($result['Sichtung'][$key]) && !in_array($key,$this->excludeMap)){
					$antwort = $result['Sichtung'][$key];
					if(isset($antworten[$antwort])){
						$antwort = $antworten[$antwort];
					}
					if($result['Sichtung'][$key] == 0 AND !empty($result['Sichtung'][$key.'_text'])){
						$antwort = $result['Sichtung'][$key.'_text'];
					}
					unset($result['Sichtung'][$key.'_text']);
					$result['Sichtung'][$key] = $antwort;
				}
			}
			foreach($this->benutztZahlenArray as $val){
				if(isset($result['Sichtung'][$val])){
					if($result['Sichtung'][$val] > 15){$result['Sichtung'][$val] = '> 15';}
				}
			}
		}
		return $results;
	}

								
	public function getAntworten($auswahl = null){
        $antworten =
            array('verteilung' =>
                array(1 =>__('einzeln'),
                    2=>__('Mutter mit Jungtier'),
                    3=>__('deutliche Schulen'),
                    0 =>__('Sonstige Verteilung')
                ),
                'verhalten' =>
                    array(1 => __('Konstanter Kurs, regelmäßiges Tauchen (schwimmen, ziehen)'),
                        2 =>__('Unterschiedlicher Kurs, kreisend, unregelmäßiges Tauchen (futtersuchend)'),
                        3 =>__('Langsames Schwimmen, längere Zeit an der Wasseroberfläche (ruhend)'),
                        0 => __('Sonstiges Verhalten')
                    ),
                'seegang' =>
                    array(1 => __('Glatte See, keine Wellen'),
                        2 => __('Ruhige See, gekräuselte, kurze Wellen'),
                        3 => __('Leicht bewegte See, Schaumköpfe'),
                        4 => __('Grobe See, lange, brechende Wellen'),
                        5 => __('Hohe See, Wellenberge und Gischt'),
                        0 => __('Keine Angabe')
                    ),
                'bootsantrieb' =>
                    array(1=>__('Motor'),
                        2=>__('Segel'),
                        3=>__('treibend'),
                        4=>__('vor Anker'),
                        0=>__('Sonstiger Bootsantrieb')
                    ),
                'eingangskanal' =>
                    array(
                        0=>__('Web'),
                        1=>__('E-Mail'),
                        2=>__('Post'),
                        3=>__('Fax'),
                        4=>__('App'),
                        5=>__('Telefon')
                    ),
                'entfernung' =>
                    array(
                        1=>__('weniger als 10 Meter'),
                        2=>__('10 bis 50 Meter'),
                        3=>__('50 bis 100 Meter'),
                        4=>__('100 bis 500 Meter'),
                        5=>__('mehr als 500 Meter')
                    ),
                'vonwo' =>
                    array(
                        1=>__('Segelschiff'),
                        2=>__('Motorboot'),
                        3=>__('Land'),
                        4=>__('Fähre'),
                        0=>__('Sonstiges')
                    ),
                'sichtweite' =>
                    array(1=>__('Außergewöhnlich klar (mehr als 20km)'),
                        2=>__('Klar (bis 20km)'),
                        3=>__('Diesig (bis 4km)'),
                        4=>__('Nebel (bis 1km)')
                    ),
                'totfund_zustand' =>
                    array(
                        0 => __("unbekannt"),
                        1 => __("keine Anzeichen von Verwesung"),
                        2 => __("sehr frisch, als ob gerade gestorben"),
                        3 => __("geringe Blutung, Haut pellt sich"),
                        4 => __("beginnende Verwesung, Haut pellt sich stark, starke Blutung"),
                        5 => __("fortgeschrittene Verwesung, Skelettteile sichtbar")
                    ),
                'totfund_geschlecht' =>
                    array(
                        0 => __('unbekannt'),
                        1 => __('weiblich'),
                        2 => __('männlich')
                    ),
                'tierart' =>
                    array(
                        0 => __('Schweinswal'),
                        1 => __('Kegelrobbe'),
                        2 => __('Seehund'),
                        3 => __('Delphin (mehrere Arten)'),
                        4 => __('Beluga'),
                        5 => __('Zwergwal'),
                        6 => __('Finnwal'),
                        7 => __('Buckelwal'),
                        8 => __('Unbekannte Walart'),
                        9 => __('Ringelrobbe'),
                        10 => __('Unbekannte Robbenart')
                    )
        );
		if($auswahl){
			if(isset($antworten[$auswahl])){
				return $antworten[$auswahl];}
		}
		return $antworten;
	}

	public function getXmlData($options = array()){
		$options['fields'] = array('namensnennung','schiffnamensnennung','gps_breite','gps_laenge','schiffsname','name','vorname','verteilung','fahrwasser','sichtungsdatum','anzahl_gesamt','anzahl_jung','id','totfund','tierart');
		$sichtungen = $this->find('all',$options);
        $sichtungenForXML = array();
		foreach($sichtungen as $sichtung){
			$sdt = strtotime($sichtung['Sichtung']['sichtungsdatum']);
			$sichtungXML['nr'] = $sichtung['Sichtung']['id'];
			$sichtungXML['datum'] = date('d.m.y',$sdt);
		  	$sichtungXML['uhrzeit'] = date('Hi',$sdt);
            $sichtungXML['tierart'] = $sichtung['Sichtung']['tierart'];
		 	$sichtungXML['fahrwasser'] =$sichtung['Sichtung']['fahrwasser'];
		  	$sichtungXML['dezigrad_n'] =$sichtung['Sichtung']['gps_breite'];
		  	$sichtungXML['dezigrad_e'] =$sichtung['Sichtung']['gps_laenge'];
            $sichtungXML['totfund'] = $sichtung['Sichtung']['totfund'];
			$ag = $sichtung['Sichtung']['anzahl_gesamt'];
            $sichtungXML['totfund'] = $sichtung['Sichtung']['totfund'];
            if ($sichtungXML['totfund']) {
                $sichtungXML['media'] = 'tot';
                $sichtungXML['groessenklasse'] = 'tot';
            }
			switch($ag){
				case 0:
					$sichtungXML['media'] = 'tot';
					$sichtungXML['anz_ber'] = $ag;
					$sichtungXML['groessenklasse'] = 'tot';
                    $sichtungXML['totfund'] = 1;
					break;
				case 1:
					$sichtungXML['media'] = 'Einzeltier';
					$sichtungXML['anz_ber'] = $ag;
					$sichtungXML['groessenklasse'] = 'Einzeltier';
					break;
				case ($ag < 6):
					$sichtungXML['media'] = '2_5';
					$sichtungXML['anz_ber'] = $ag;
					$sichtungXML['groessenklasse'] = '2-5 Tiere';
					break;
				case ($ag < 11):
					$sichtungXML['media'] = '6_10';
					$sichtungXML['anz_ber'] = $ag;
					$sichtungXML['groessenklasse'] = '6-10 Tiere';
					break;
				case ($ag < 16):
					$sichtungXML['media'] = '11_15';
					$sichtungXML['anz_ber'] = $ag;
					$sichtungXML['groessenklasse'] = '11-15 Tiere';
					break;
				case ($ag > 15):
					$sichtungXML['media'] = '_15';
					$sichtungXML['anz_ber'] = $ag;
					$sichtungXML['groessenklasse'] = 'Mehr als 15 Tiere';
					break;
					
			}
 			$sichtungXML['jungtiere'] =$sichtung['Sichtung']['anzahl_jung'];
			
		  	$gps_n =$sichtung['Sichtung']['gps_breite'];
		  	$gps_e =$sichtung['Sichtung']['gps_laenge'];
			$X = round($gps_e*6371000*pi()/180,5);
			$Y = round(log(tan($gps_n*pi()/360+pi()/4))*6371000,5);
			$sichtungXML['x'] = round(($X-1050792.0567911)/628251.3355417,3);
			$sichtungXML['y'] = round(($Y-7138521.4416712)/909594.5299957,3);
			
			
		 	$sichtungXML['schiff'] = ($sichtung['Sichtung']['namensnennung'] OR $sichtung['Sichtung']['schiffnamensnennung'])?$sichtung['Sichtung']['schiffsname']:'';
			
		 	$sichtungXML['person'] = $sichtung['Sichtung']['namensnennung']?$sichtung['Sichtung']['vorname'] . ' ' . $sichtung['Sichtung']['name']:'';
			
			$sichtungenForXML[] = $sichtungXML;
		}
		return $sichtungenForXML;
	}

    private function cleanCsvData($data) {
        $sichtung = $data;
        $sichtung['Sichtung']['gps_breite'] = str_replace('.', ',', $sichtung['Sichtung']['gps_breite']);
        $sichtung['Sichtung']['gps_laenge'] = str_replace('.', ',', $sichtung['Sichtung']['gps_laenge']);
        unset($sichtung['Sichtung']['location'], $sichtung['Sichtung']['ostsee']);
        foreach(array_keys($sichtung['Sichtung']) as $key) {
            $sichtung['Sichtung'][$key] = str_replace('"','""',$sichtung['Sichtung'][$key]);
            $sichtung['Sichtung'][$key] = str_replace(array("\r","\r\n"),'',$sichtung['Sichtung'][$key]);
        }
        return $sichtung;
    }

	public function getCsvData($options){
        $this->excludeMap = array('totfund_zustand');
		$data = $this->find('all',$options);
        $data = array_map(array($this, "cleanCsvData"), $data);
		$header['Sichtung'] = array_keys($data[0]['Sichtung']);
		array_unshift($data,$header);
		return $data;
	}

    public function getJsonData($options){
        $this->excludeMap = array('tierart');
        $data = $this->find('all',$options);
        return $data;
    }

    public function getReports($options, $admin = false) {
        $data = $this->find('all',$options);
        $func = new ReportUtils();
        $func->admin = $admin;
        $func->model = $this;
        $reports = array_map(array($func,'arrayMapReport'), $data);
        return $reports;
    }

    public function _formatDMS($dec){
        $vars = explode(".",$dec);
        $deg = $vars[0];
        $tempma = "0.".$vars[1];

        $tempma = $tempma * 3600;
        $min = floor($tempma / 60);
        $sec = $tempma - ($min*60);

        return array("deg"=>$deg,"min"=>$min,"sec"=>$sec);

    }
    public function formatDMS($lat, $lon) {
        $alat = $this->_formatDMS($lat);
        $alon = $this->_formatDMS($lon);
        $ret = vsprintf("%02d° %02d' %02.2f\"",$alat) . (($alat['deg']<0)?"S":"N");
        $ret .= vsprintf(" - %02d° %02d' %02.2f\"",$alon) . (($alon['deg']<0)?"W":"E");
        return $ret;

    }
    public function getForKml($options) {
        $this->excludeMap = array('tierart');
        $data = $this->find('all',$options);
        $counts = array(
            "eq_1" => 0,
            "2_5" => 0,
            "5_10" => 0,
            "11_15" => 0,
            "gt_15" => 0,
            "dead" => 0
        );
        $reports = new SimpleXMLExtended('<kml/>');
        $folder = $reports->addChild("Folder");
        $folder->addChild("styleUrl", "#style1");
        $folder->addChild("name","Sichtungen");
        //debug($data);
        foreach($data as $sichtung) {
            $desc = '';
            $report = $folder->addChild("Placemark");
            $report->addChild("name", date('d.m.y H:i', strtotime($sichtung['Sichtung']['sichtungsdatum'])));
            if ($sichtung['Sichtung']['tierart'] != 0) $desc .= "<p><label>" . __("Tierart") . ": </label>" . $this->getAntworten('tierart')[$sichtung['Sichtung']['tierart']] . "</p>";
            $desc .= "<p><label>" . __("Position") . ": </label>" . $this->formatDMS($sichtung['Sichtung']['gps_breite'], $sichtung['Sichtung']['gps_laenge']) . "</p>";
            $desc .= "<p><label>" . __("Anzahl Tiere") . ": </label>" . $sichtung['Sichtung']['anzahl_gesamt'] . "</p>";
            if (isset($sichtung['Sichtung']['anzahl_jung']) && $sichtung['Sichtung']['anzahl_jung'] > 0) $desc .= "<p><label>" . __("Davon Jungtiere") . ": </label>" . $sichtung['Sichtung']['anzahl_jung'] . "</p>";
            if ($sichtung['Sichtung']['schiffsname'] != "" && ($sichtung['Sichtung']['namensnennung'] || $sichtung['Sichtung']['schiffnamensnennung'])) $desc .= "<p><label>" . __("Schiffsname") . ": </label>" . $sichtung['Sichtung']['schiffsname'] . "</p>";
            if ($sichtung['Sichtung']['namensnennung']) $desc .= "<p><label>" . __("Name") . ": </label>" . $sichtung['Sichtung']['vorname'] . ' ' . $sichtung['Sichtung']['name'] . "</p>";
            if ($sichtung['Sichtung']['fahrwasser'] != "") $desc .= "<p><label>" . __("Fahrwasser") . ": </label>" . $sichtung['Sichtung']['fahrwasser'] . "</p>";
            $report->addChild("description")->addCData($desc);
            $report->addChild("Point")->addChild("coordinates", $sichtung['Sichtung']['gps_laenge'] . "," . $sichtung['Sichtung']['gps_breite']);
            $ct = $sichtung['Sichtung']['anzahl_gesamt'];
            $report->addChild("TimeStamp")->addChild("when", date('Y-m-d\TH:i:sP', strtotime($sichtung['Sichtung']['sichtungsdatum'])));
            $style = "#style1";
            if ($sichtung['Sichtung']['totfund'] != 0) {
                $style = "#style0";
                $counts["dead"]++;
            } else if ($sichtung['Sichtung']['tierart'] != 0) {
                $style = "#style_ta";
                @$counts[$sichtung['Sichtung']['tierart']]++;
            } else {
                switch ($ct) {
                    case 1:
                        $style = "#style1";
                        $counts["eq_1"]++;
                        break;
                    case 0:
                        $style = "#style0";
                        $counts["dead"]++;
                        break;
                    case ($ct < 6):
                        $style = "#style2";
                        $counts["2_5"]++;
                        break;
                    case ($ct < 11):
                        $style = "#style3";
                        $counts["5_10"]++;
                        break;
                    case ($ct < 16):
                        $style = "#style4";
                        $counts["11_15"]++;
                        break;
                    case ($ct > 15):
                        $style = "#style5";
                        $counts["gt_15"]++;
                        break;
                }
            }
            $report->addChild('styleUrl', $style);
        }
        $ext = $folder->addChild("ExtendedData")->addChild("Data");
        $ext->addAttribute("name","counts");
        $ext->addChild("value", implode(",", $counts));
        return $reports;
    }
	
	public function getEmailAddresses(){
		$data = $this->find('all', array(
			'fields' => array('Sichtung.email','max(Sichtung.name) as name','max(Sichtung.vorname) as vorname','max(Sichtung.strasse) as strasse','max(Sichtung.plz) as plz','max(Sichtung.ort) as ort','max(Sichtung.telefon) as telefon','max(Sichtung.fax) as fax','max(Sichtung.sichtungsdatum) as letzte_Sichtung'),
			'group' => array('Sichtung.email'),
            'order' => array('max(sichtungsdatum) DESC')
			));
        //debug($data);
		$header['Sichtung'] = array_keys($data[0]['Sichtung']);
        $header[0] = array_keys($data[0][0]);
		array_unshift($data,$header);
		return $data;
	}

    public function getDistinctYears(){
        $data = $this->find('all', array(
            'fields' => array("DISTINCT EXTRACT('year' FROM sichtungsdatum) AS year"),
            'order' => array('year ASC'),
            'conditions' => array('EXTRACT(year FROM sichtungsdatum) > 2011','Sichtung.geprueft = 1')
        ));
        $years = [];
        foreach ($data as $year) {
            $years[$year[0]['year']] = $year[0]['year'];
        }
        return $years;
    }

}

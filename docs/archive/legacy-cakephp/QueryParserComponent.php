<?php
/**
 * Created by PhpStorm.
 * User: jansinger
 * Date: 04.03.14
 * Time: 14:32
 */
App::uses('Component', 'Controller');
class QueryParserComponent extends Component {

    private $_Controller;

    public static $chartBox = '9.4,53,30.2,66';

    public function startup(Controller $controller) {
        $this->_Controller = $controller;
    }

    public function parseList($defaultYear, $admin) {
        $options['fields'] = array('namensnennung','schiffnamensnennung','gps_breite','gps_laenge','schiffsname','bootstyp','heimathafen','name','vorname','fahrwasser','bootsantrieb','vonwo','vonwo_text','entfernung','anzahl_schiffe','sichtungsdatum','anzahl_gesamt','anzahl_jung','id','totfund','tierart','verhalten','verhalten_text','reaktion','sonstige_auffaelligkeiten','verteilung','verteilung_text','windrichtung','windstaerke','sichtweite','seegang');
        if ($admin) {
            array_push($options['fields'], 'ostsee','ostsee_geo','geprueft','strasse','plz','ort','telefon','fax','email','kommentar_intern','aufnahme','aufnahmeHochladen','bemerkungen', 'created', 'eingangskanal', 'freigegeben_am', 'totfund', 'totfund_groesse', 'totfund_zustand', 'totfund_geschlecht');
        } else {
            $options['conditions'] = array('ostsee_geo >' => 0, 'geprueft' => '1');
        }
        $year = $this->_Controller->request->query('year');
        if (!$year) {
            $year = $this->_Controller->request->pass[0];
        }
        if ($year && is_numeric($year) && preg_match('/^[\d]{4}$/', $year)) {
            $options['conditions']["EXTRACT(YEAR FROM sichtungsdatum) ="] = $year;
        } else {
            $options['conditions']["EXTRACT(YEAR FROM sichtungsdatum) ="] = $defaultYear;
        }
        if (isset($this->_Controller->request->query['search'])) {
            $searchFor = strtolower(trim($this->_Controller->request->query('search')));
            $options['conditions']['OR'] = array(
                'lower(email) LIKE' => "%" . $searchFor . "%",
                'lower(name) LIKE' => "%" . $searchFor . "%",
                'lower(vorname) LIKE' => "%" . $searchFor . "%",
                'lower(schiffsname) LIKE' => "%" . $searchFor . "%",
            );
        }
        if (isset($this->_Controller->request->query['location'])) {
            $found = preg_match('/^([\d\.-]+),([\d\.-]+)$/', $this->_Controller->request->query('location'), $match);
            if ($found != 1)
                throw new BadRequestException("Please check query parameters.");
            list(,$lat,$lon) = $match;
            $distance = (isset($this->_Controller->request->query['distance']))?$this->_Controller->request->query('distance'):100000;
            $options['conditions']["ST_DWithin(location::geography, ST_MakePoint($lon,$lat), $distance) ="] = true;
            $options['fields'][] = "ST_Distance(location::geography, ST_MakePoint($lon,$lat)) AS distance";
            $options['order']= array('distance');
        } else {
            $bbox = $this->_Controller->request->query('bbox');
            if ($bbox) {
                $found = preg_match('/^([\d\.-]+),([\d\.-]+),([\d\.-]+),([\d\.-]+)$/', $bbox);
                if ($found != 1) {
                    throw new BadRequestException("Please check query parameters.");
                }
                $bbox = sprintf('ST_Intersection(ST_MakeEnvelope(%s,66,4326),ST_MakeEnvelope(%s))',QueryParserComponent::$chartBox,$bbox);
            } else {
                $bbox = sprintf('ST_MakeEnvelope(%s,4326)',QueryParserComponent::$chartBox);
            }
            $options['conditions']["Sichtung.location && $bbox ="] = true;
            $options['order'] = array('sichtungsdatum');
        }
        return $options;
    }
}
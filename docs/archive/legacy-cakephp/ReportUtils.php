<?php
/**
 * Created by PhpStorm.
 * User: jansinger
 * Date: 04.03.14
 * Time: 18:28
 */

class ReportUtils {

    public $admin = false;
    public $model = null;
    public function arrayMapReport($data){
        return ReportUtils::mapReport($data, $this->admin, $this->model);
    }
    public function arrayMapGeoJSON($data){
        return ReportUtils::mapGeoJSON($data, $this->admin, $this->model);
    }

    public static function mapReport($data, $admin = false, $model = null){
        $ts = strtotime($data['Sichtung']['sichtungsdatum']);
        $report = array(
            'ts' => $ts,
            'id' => $data['Sichtung']['id'],
            'dt' => date('d.m.y',$ts),
            'ti' => date('H:i',$ts),
            'lat' => $data['Sichtung']['gps_breite'],
            'lon' => $data['Sichtung']['gps_laenge'],
            'ct' => $data['Sichtung']['anzahl_gesamt'],
            'yo' => $data['Sichtung']['anzahl_jung'],
            'ta' => $data['Sichtung']['tierart'],
            'tf' => $data['Sichtung']['totfund']
        );
        //if ($model != null) $report['ta'] = $model->getAntworten('tierart')[$report['ta']];
        if ($data['Sichtung']['fahrwasser'] != "") $report['ar'] = $data['Sichtung']['fahrwasser'];
        if ($data['Sichtung']['schiffsname'] != "" && ($data['Sichtung']['namensnennung'] || $data['Sichtung']['schiffnamensnennung'])) $report['sh'] = $data['Sichtung']['schiffsname'];
        if ($data['Sichtung']['namensnennung']) $report['na'] = $data['Sichtung']['vorname'] . ' ' . $data['Sichtung']['name'];
        if (isset($data[0]['distance'])) $report['di'] = $data[0]['distance'];
        if ($admin) {
            $report['bm'] = $data['Sichtung']['ostsee'];
            $report['ba'] = $data['Sichtung']['ostsee_geo'];
            $report['va'] = $data['Sichtung']['geprueft'];
        }
        return $report;
    }

    public static function mapGeoJSON($data, $admin = false, $model = null){
        $report = ReportUtils::mapReport($data,$admin,$model);
        return array(
            "type" => "Feature",
            "geometry" => array(
                "type" => "Point",
                "coordinates" => array(floatval($report['lon']),floatval($report['lat']))
            ),
            "properties" => $report
        );
    }


} 
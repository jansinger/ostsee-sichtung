<?php
/**
 * @author Malte Srocke <maltesrocke@yahoo.de>
 * 
 */
App::uses('AppController', 'Controller');
App::uses('CakeEmail', 'Network/Email');

class SichtungenController extends AppController {

	public $name = 'Sichtungen';
	public $helpers = array('Form','Paginator','Js'=>array('Jquery'));
	public $components = array('RequestHandler','Paginator','QueryParser');

	public $uses = array('Sichtung');
	
	public $paginate = array('order'=>'geprueft ASC, CASE WHEN geprueft = 1 THEN sichtungsdatum ELSE created END DESC');

    public function beforeFilter(){
        parent::beforeFilter();
        $this->Auth->allow(array('add','export','antworten','showReports','inBaltic','all'));
        $this->Security->csrfCheck = false;
        $this->Security->validatePost = false;
        if (IS_PROD) {
            $this->Security->requireSecure('index', 'edit','delete','details','changeStatus');
        }
        if ($this->request->param('ext') == 'kml') {
            $this->viewClass = "Kml";
        }
    }

    public function clear(){
        clearCache();
        $this->view = 'add';
        $intern = false;
        $this->set('intern');
    }

	public function add($intern = false){
		if(!empty($this->request->data)){
			$data = $this->request->data;
			$data = $this->Sichtung->massageData($data);
			if($this->Sichtung->save($data)){
				$this->Session->setFlash(__('Die Sichtung wurde erfolgreich in der Datenbank gespeichert.'));
				unset($this->request->data);
				if($intern){
					$this->redirect(array('action'=>'index','op'=>1));
				}
			} else {
				$this->Session->setFlash(__('Die Sichtung konnte nicht gespeichert werden.<br />Bitte füllen Sie alle Felder unter "Wichtigste Angaben" aus.'));
			}
		}
		$antworten = $this->Sichtung->getAntworten();
		$this->set(compact('antworten','intern'));
	}
	
	public function edit($id = null){
		$this->view = 'add';
		$intern = true;
		$this->Sichtung->id = $id;
		if(!$this->Sichtung->exists()){
			$this->redirect(array('action'=>'index','op'=>1));
		}
		if(!empty($this->request->data)){
            $this->request->allowMethod('post','put');
			$data = $this->Sichtung->massageData($this->request->data);
            //pr($data);
			if($this->Sichtung->save($data)){
				$this->Session->setFlash(__('Die Sichtung wurde erfolgreich bearbeitet.'));
				$this->redirect(array('action'=>'index','op'=>1));
			} else {
				$this->Session->setFlash(__('Die Sichtung konnte nicht bearbeitet werden.'));
                pr($this->Sichtung->validationErrors);
			}
		}
		$this->request->data = $this->Sichtung->getDataForEditForm();
		$antworten = $this->Sichtung->getAntworten();
		$this->set(compact('antworten','intern'));
	}
	
	public function delete($id = null){
        if ($this->Sichtung->delete($id)) {
            $this->response->header('Code',200);
        }
		$this->response->header('Code',500);
	}
	
	public function index(){
		$isAjax = $this->request->is('ajax');
        $tableOnly = $isAjax;
        $this->Paginator->settings = $this->paginate;
		if(!$isAjax && !isset($this->request->params['named']['op'])){
			$this->Session->delete('paginationNamed');
			$this->Session->delete('paginationConditions');
		}
		if(isset($this->request->params['named'])){
			if(isset($this->request->params['named']['op'])){
				$named = $this->Session->read('paginationNamed');
			} else {
				$named = $this->request->params['named'];
				$this->Session->write('paginationNamed',$this->request->params['named']);
			}
		}
        $conditions = $this->Session->read('paginationConditions');
		if($this->request->data){
			$conditions = array();
            $year = $this->request->data('filterForm.year.year');
			$filterFormData = $this->request->data['filterForm'];
			if($this->request->data('filterForm.filterVonBis')){
				$von = $filterFormData['von'];
				$bis = $filterFormData['bis'];
				$conditions['Sichtung.sichtungsdatum >='] = $year.'-'.$von['month'].'-'.$von['day'].' 00:00';
				$conditions['Sichtung.sichtungsdatum <='] = $year.'-'.$bis['month'].'-'.$bis['day'].' 23:59';
			} else {
                $conditions["EXTRACT(YEAR FROM sichtungsdatum) ="] = $year;
            }
			if($filterFormData['geprueft'] != 'nein'){
				$conditions['Sichtung.geprueft'] = $filterFormData['geprueft'];
			}
			if($filterFormData['eingangskanal'] != 'nein'){
				$conditions['Sichtung.eingangskanal'] = $filterFormData['eingangskanal'];
			}
            $this->Session->write('showYear', $year);
		} else if (count($conditions) == 0) {
            $year = $this->Sichtung->getDefaultYear();
            $this->request->data('filterForm.year.year', $year);
            $conditions = array("EXTRACT(YEAR FROM sichtungsdatum) =" => $year);
            $this->Session->write('showYear', $year);
        } else {
            $year = $this->Session->read('showYear');
        }
		$this->Session->write('paginationConditions',$conditions);
		$this->request->params['named'] = (isset($named) && is_array($named))?$named:array();
		$sichtungen = $this->Paginator->paginate('Sichtung',$conditions);
		$eingangskanaele = $this->Sichtung->getAntworten('eingangskanal');
		$this->set(compact('sichtungen','tableOnly','eingangskanaele','year'));
	}
	
	public function details($id = null){
		$this->Sichtung->id = $id;
		if(!$this->Sichtung->exists()){
			$this->Session->setFlash(__('Keine Sichtung mit dieser ID vorhanden.'));
			$this->redirect(array('action'=>'index','op'=>1));
		}
		$sichtung = $this->Sichtung->find('all',array('conditions'=>array('Sichtung.id'=>$id)));
		$sichtung = $sichtung[0];
		$this->set(compact('sichtung'));
	}
	
	
	public function changeStatus($fieldName = null,$id = null,$redirect = null){
		if(empty($fieldName) OR empty($id)){
			$this->Session->setFlash(__('Feldname und ID fehlt!'));
			$this->redirect(array('action'=>'index','op'=>1));
            return;
		}
		if(!in_array($fieldName,array('ostsee','geprueft'))){
			$this->Session->setFlash(__('Nicht erlaubt!'));
			$this->redirect(array('action'=>'index','op'=>1));
            return;
		}
		$this->Sichtung->id = $id;
		if(!$this->Sichtung->exists()){
			$this->Session->setFlash(__('Keine Sichtung mit dieser ID vorhanden.'));
			$this->redirect(array('action'=>'index','op'=>1));
            return;
		}
		// change status -> if true, set false now		
		$status = ($this->Sichtung->field($fieldName) == 1)?0:1;
		//print 'UPDATE sichtungen SET '.$fieldName.'='.$status.' WHERE id='.$id;
		//$this->Sichtung->query('UPDATE sichtungen SET '.$fieldName.'='.$status.' WHERE id='.$id);
        $this->Sichtung->saveField($fieldName, $status);
		#wenn geprueft auf ja gesetzt wird:
		if($fieldName == 'geprueft' AND $status == 1){
			$this->Sichtung->saveField('freigegeben_am',date("Y-m-d H:i:s"));
			$this->redirect(array('action'=>'sendeIstLiveMail',$id));
		}
		if($redirect == 'details'){
			$this->redirect(array('action'=>'details',$id));
		} else {
			$this->redirect(array('action'=>'index','op'=>1));
		}
	}

	public function sendeIstLiveMail($id = null){
		$eingangskanalEmailText = array(
								0=>__("emailTextOnline"),
								1=>__("emailTextOnline"),
								2=>__("emailTextOffline"),
								3=>__("emailTextOffline"),
								4=>__("emailTextApp"),
								5=>__("emailTextOffline")
								);
		$this->layout = 'overlayer';
		if(!$id){
			return false;
		}
		$this->Sichtung->id;
		if(isset($this->request->data['sendLiveMail'])){
			extract($this->request->data['sendLiveMail']);
			$mail = new CakeEmail();
			$mail->emailFormat('html');
            $mail->from($von);
			$mail->to($an);
			$mail->template('default');
			$mail->viewVars(array('text'=>$text));
			$mail->subject($betreff);
			print_r($mail->send());
			$this->Session->setFlash(__('Die E-Mail wurde an den Sichter verschickt.'));
			$this->redirect(array('action'=>'index','op'=>1));
		}
		$sichterInfo = $this->Sichtung->find('first',array('fields'=>array('eingangskanal','email'),'conditions'=>'Sichtung.id = '.$id));
		$this->request->data['sendLiveMail']['von'] = 'sichtungen@meeresmuseum.de';
		$this->request->data['sendLiveMail']['an'] = $sichterInfo['Sichtung']['email'];
		$this->request->data['sendLiveMail']['text'] = $eingangskanalEmailText[$sichterInfo['Sichtung']['eingangskanal']];
		$this->request->data['sendLiveMail']['betreff'] = __('Vielen Dank für Ihre Sichtungsmeldung');
		$this->set('header',__('E-Mail an Sichter schicken'));
	}
	
	public function export(){
        $options = $this->QueryParser->parseList($this->Sichtung->getDefaultYear(),$this->Auth->user());
		if($this->request->params['ext'] == 'xml'){
            if (!$this->Auth->user()) {
			    $options['conditions'][] = array('Sichtung.geprueft'=>1);
            }
			$data = $this->Sichtung->getXmlData($options);
		}
		if($this->request->params['ext'] == 'csv'){
			$data = $this->Sichtung->getCsvData($options);
		}
		if($this->request->params['ext'] == 'txt'){
			$data = $this->Sichtung->getEmailAddresses();
		}
        if($this->request->params['ext'] == 'json'){
            $data = $this->Sichtung->getJsonData($options);
        }
		if(empty($data)){
			echo 'Keine Sichtungen gefunden!';
		}
		$this->set('sichtungen',$data);
	}

    public function showReports(){
        $this->view = 'export';
        $options = $this->QueryParser->parseList($this->Sichtung->getDefaultYear(),$this->Auth->user());
        if($this->request->params['ext'] == 'kml'){
            $data = $this->Sichtung->getForKml($options);
        } else {
            $data = $this->Sichtung->getReports($options, $this->Auth->user());
        }
        $this->set('sichtungen',$data);
    }

    public function all(){
        $options = $this->QueryParser->parseList($this->Sichtung->getDefaultYear(),$this->Auth->user());
        $data = $this->Sichtung->getJsonData($options);
        $func = new ReportUtils();
        $func->admin = $this->Auth->user();
        $func->model = $this->Sichtung;
        $data = array(
            "type" => "FeatureCollection",
            "crs" => array(
                "type" => "name",
                "properties" => array(
                    "name" => "EPSG:4326"
                )
            ),
            "features" => array_map(array($func,'arrayMapGeoJSON'), $data)
        );
        $this->set('sichtungen',$data);
    }
	
	public function sichtungenInKarte($openInfowindowId = null){
		$this->set('id',$openInfowindowId);
	}

    public function years(){
        $this->view = 'export';
        $data = $this->Sichtung->getDistinctYears();
        $this->set('sichtungen', $data);
    }

    public function inBaltic(){
        $this->view = 'export';
        $found = preg_match('/^([\d\.-]+),([\d\.-]+)$/', $this->request->query('location'), $match);
        if ($found != 1)
            throw new BadRequestException("Please check query parameters.");
        list(,$lat,$lon) = $match;
        $data = $this->Sichtung->getPointInBaltic($lon,$lat);
        $this->set('sichtungen', $data[0][0]);
    }
	
}
?>
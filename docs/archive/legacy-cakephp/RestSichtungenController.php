<?php
/**
 * @author Malte Srocke <maltesrocke@yahoo.de>
 * 
 */
App::uses('AppController', 'Controller');
App::uses('ReportUtils','util');

class RestSichtungenController extends AppController {

	public $name = 'RestSichtungen';
	public $components = array('RequestHandler','QueryParser');

	public $uses = array('Sichtung');

    public function beforeFilter(){
        parent::beforeFilter();
        $this->Auth->allow('add','antworten','inBaltic','index','view');
        $this->Security->csrfCheck = false;
        if (!$this->RequestHandler->ext) $this->RequestHandler->ext = 'json';
    }

	public function add(){
        $this->request->allowMethod('post');
		$this->layout = 'json/default';
        $message['message'] = 'No data send.';
        $data = $this->request->input('json_decode');
		if(!empty($data)){
			if($this->Sichtung->save($data)){
				$message['message'] = 'Saved';
                $this->response->statusCode(201);
                $this->response->header('Location',
                    Router::url(array('controller' => 'rest_sichtungen', 'action' => 'view','ext' => 'json', $this->Sichtung->id), true)
                );
			} else {
				$message['message'] = 'Validation failed.';
                $message['errors'] = $this->Sichtung->validationErrors;
                $this->response->statusCode(400);
            }
		}
        $this->set(array(
            'message' => $message,
            '_serialize' => array('message')
        ));
	}
	
	public function antworten(){
		$this->set('antworten',$this->Sichtung->getAntworten());
	}

    public function view($id){
        $report = $this->Sichtung->findById($id);
        if (!$report || !isset($report['Sichtung'])){
           throw new NotFoundException(__('Invalid report'));
        }
        if (!$this->Auth->user()) {
            $report['Sichtung'] = ReportUtils::mapReport($report);
        }
        $this->set(array(
            'Sichtung' => $report['Sichtung'],
            '_serialize' => 'Sichtung'
        ));
    }

    public function index(){
        $options = $this->QueryParser->parseList($this->Sichtung->getDefaultYear(),$this->Auth->user());
        $data = $this->Sichtung->getReports($options, $this->Auth->user());
        $this->set(array(
            'Sichtungen' => $data,
            '_serialize' => 'Sichtungen'
        ));
    }

    public function edit($id) {
        $this->Sichtung->id = $id;
        if ($this->Sichtung->save($this->request->data)) {
            $message = 'Saved';
        } else {
            $message = 'Error';
        }
        $this->set(array(
            'message' => $message,
            '_serialize' => array('message')
        ));
    }

    public function delete($id) {
        if ($this->Sichtung->delete($id)) {
            $message = 'Deleted';
        } else {
            $message = 'Error';
        }
        $this->set(array(
            'message' => $message,
            '_serialize' => array('message')
        ));
    }

    public function inBaltic(){
        $found = preg_match('/^([\d\.-]+),([\d\.-]+)$/', $this->request->query('location'), $match);
        if ($found != 1)
            throw new BadRequestException("Please check query parameters.");
        list(,$lat,$lon) = $match;
        $data = $this->Sichtung->getPointInBaltic($lon,$lat);
        $this->set(array(
            'sichtungen' => $data[0][0],
            '_serialize' => 'sichtungen'
            )
        );
    }
	
}
?>
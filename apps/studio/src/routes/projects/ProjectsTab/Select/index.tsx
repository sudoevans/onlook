import { useProjectsManager } from '@/components/Context';
import { observer } from 'mobx-react-lite';
import { useEffect, useState } from 'react';
import EmblaCarousel from './Carousel';
import ProjectInfo from './Info';
import type { Project } from '@onlook/models/projects';

const SelectProject = observer(() => {
    const projectsManager = useProjectsManager();
    const [projects, setProjects] = useState<Project[]>(projectsManager.projects);
    const [currentProjectIndex, setCurrentProjectIndex] = useState(0);
    const [direction, setDirection] = useState(0);
    const [deletingProjectId, setDeletingProjectId] = useState<string | null>(null);

    useEffect(() => {
        const sortedProjects = projectsManager.projects.sort(
            (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
        );
        setProjects(sortedProjects);
    }, [projectsManager.projects]);

    const handleProjectChange = (index: number) => {
        if (currentProjectIndex === index) {
            return;
        }
        setDirection(index > currentProjectIndex ? 1 : -1);
        setCurrentProjectIndex(index);
    };

    const handleDeleteStart = (projectId: string) => {
        console.log('Starting delete for project:', projectId);
        setDeletingProjectId(projectId);
    };

    const handleDeleteComplete = (project: Project) => {
        console.log('Completing delete for project:', project.id);
        projectsManager.deleteProject(project);
        setDeletingProjectId(null);
    };

    return (
        <>
            <div className="w-3/5 overflow-visible">
                <EmblaCarousel
                    slides={projects}
                    onSlideChange={handleProjectChange}
                    onProjectDelete={handleDeleteComplete}
                    deletingProjectId={deletingProjectId}
                />
            </div>
            <div className="w-2/5 flex flex-col justify-center items-start p-4 mr-10 gap-6">
                <ProjectInfo
                    project={projects[currentProjectIndex]}
                    direction={direction}
                    onDeleteStart={handleDeleteStart}
                />
            </div>
        </>
    );
});

export default SelectProject;

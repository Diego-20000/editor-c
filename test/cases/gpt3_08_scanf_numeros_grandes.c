#include <stdio.h>

int main()
{
    float F = 0.0f;
    double D = 0.0;
    int R;

    R = scanf("%f %lf", &F, &D);

    printf("R=%d\n", R);
    printf("F=%.8e\n", F);
    printf("D=%.8e\n", D);
}

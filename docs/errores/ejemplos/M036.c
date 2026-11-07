#include <stdio.h>
int main()
{
    int x = 1;
    printf("%f\n", x ? 2 : 3.0);
    printf("%d\n", x ? 'a' : 0);
    printf("%f\n", x ? 5 : 2.5f);
    printf("%d\n", (x ? -1 : 1u) > 0);
    printf("%d\n", x ? 1 : 2.5);
    float f = x ? 1 : 0.5;
    printf("%f\n", f);
    return 0;
}
